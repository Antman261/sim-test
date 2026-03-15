import { TextLineStream } from '@std/streams/text-line-stream';
import { makeLogger, simLog } from '../log.ts';
import { mergeDeep } from '../util/deepMerge.ts';
import { releasePort, requestPort } from './portManager.ts';
import type { JsonResponse, Obj, TextResponse } from './types.ts';
import { failTest } from '../harness/failureInjector.ts';
import { delay } from '@std/async';

/**
 * Configure an application to run in the simulation.
 *
 * It is strongly recommended that every application under test accepts a --sim-seed=123 argument for any pseudorandom behaviour.
 */
export type AppConfig = {
  /**
   * A human readable name for the application, used in logs
   */
  name: string;
  /**
   * Path to the application executable. Best to use an absolute path.
   */
  appPath: string;
  /**
   * These arguments will be supplied to the application, along with the sim-test's seed
   */
  args?: string[];
  /**
   * Set true if you want to connect a debugger to this application once it has started and before the tests begin running. Once the application has started, sim-test will wait for user confirmation before continuing, giving you time to start and connect a debugger.
   */
  debug?: boolean;
  /**
   * Set a port for applications listening on a socket. This allows sim-test to provide utility methods on the application instance, such as `.http.get` to send a HTTP GET request to the application.
   *
   * If you want sim-test to automatically assign a port from it's available port range (6000 to 7000 by default), set this value to 0. sim-test will provide the application's assigned port via the `--port=<port>` argument.
   *
   * If the port is not set, using methods under `.http`, `.websocket`, and `.socket` will throw an exception. Applications without a port only support input via methods under `.stdin`
   *
   * If any two application instances request the same port, sim-test will throw an exception.
   */
  port?: number;
  stderr?: LogOptions;
  stdout?: LogOptions;
};
/**
 * Control whether or not sim tests routes loglines to output, or uses them to trigger a test failure.
 */
type LogOptions = {
  /**
   * If supplied, loglines matching this pattern will be logged to the test output. Default is `logRegex.matchAll`
   */
  logPattern?: RegExp;
  /**
   * If supplied, a log matching this pattern will cause a test to fail. Default is `logRegex.matchNothing`. In many tests, `logRegex.matchError` is sufficient
   */
  failPattern?: RegExp;
};

export type App = {
  readonly name: string;
  readonly status: 'starting' | 'running' | 'exited';
  /**
   * If the application was registered with a port, or requested a port, this value will be populated with the application port
   */
  port?: number;
  /**
   * For applications with a network port, this collection of methods dispatches HTTP requests to that port.
   */
  http: {
    fetch(path: string, options?: RequestInit): Promise<Response>;
    postJson<T extends Obj = Obj>(
      path: string,
      data: Obj,
      options?: RequestInit,
    ): Promise<JsonResponse<T>>;
    getText(path: string, options?: RequestInit): Promise<TextResponse>;
    getJson(path: string, options?: RequestInit): Promise<JsonResponse>;
  };
  websocket: {
    // TODO
    connect(handler: <A>(msg: A) => void): Promise<{
      send(msg: Obj | string): Promise<void>;
      disconnect(): Promise<void>;
    }>;
  };
  socket: unknown; // TODO, probably use streams
  stdout: {
    /** Reads all logs written to stdout since the previous call */
    readLogs(): string[];
    /** Returns a stream of stdout, useful for custom log parsing */
    // getStream(): ReadableStream;
  };
  stderr: {
    /** Reads all logs written to stderr since the previous call */
    readLogs(): string[];
    /** Returns a stream of stderr, useful for custom log parsing */
    // getStream(): ReadableStream;
  };
  stdin: {
    /** Write a byte array to the application's stdin */
    writeBytes(buf: Uint8Array): Promise<void>;
    /** Write text to the application's stdin using TextEncoder */
    writeText(text: string): Promise<void>;
    /**
     * Write line of text to the application's stdin using TextEncoder.
     * Like writeText, but also appends a new line
     */
    writeTextLine(text: string): Promise<void>;
  };
  /**
   * Issues a SIGTERM and cleans up the process.
   *
   * You don't normally need to call this function, unless you are specifically testing process termination.
   */
  end(): Promise<void>;
};

export const logRegex = {
  matchAll: /./g,
  matchNothing: /[^\d\D]/g,
  matchError: /error/,
} as const;

const fillAppConfig = (config: AppConfig): Required<
  AppConfig
> =>
  mergeDeep(
    {
      stderr: {
        logPattern: logRegex.matchAll,
        failPattern: logRegex.matchError,
      },
      stdout: {
        logPattern: logRegex.matchAll,
        failPattern: logRegex.matchNothing,
      },
      args: [],
      debug: false,
      port: -1,
      name: '',
      appPath: '',
    } as const satisfies AppConfig,
    config,
  );

export const startAppInstance = async (config: AppConfig): Promise<App> => {
  const cfg = fillAppConfig(config);
  const port = cfg.port === 0 ? requestPort() : cfg.port;
  const hasPort = port > 0;
  const host = hasPort ? `http://localhost:${port}/` : '';
  if (hasPort) cfg.args.push(`--port=${port}`);
  simLog(`Starting ${cfg.name} with ${cfg.appPath} ${cfg.args.join(' ')}`);
  try {
    const process = toPiped(cfg.appPath, cfg.args).spawn();
    const log = makeLogger('app', process.pid, cfg.name);
    const stderrLogs: string[] = []; // TODO: Replace with ring buffer
    const stdoutLogs: string[] = []; // TODO: Replace with ring buffer

    (async () => {
      for await (
        const logLine of process.stderr
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new TextLineStream())
      ) {
        stderrLogs.push(logLine);
        if (cfg.stderr?.logPattern?.test(logLine)) log(`stderr: ${logLine}`);
        if (cfg.stderr?.failPattern?.test(logLine)) {
          failTest(`Failed on stderr: ${logLine}`);
        }
      }
    })();
    (async () => {
      for await (
        const logLine of process.stdout
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new TextLineStream())
      ) {
        stdoutLogs.push(logLine);
        if (cfg.stdout?.logPattern?.test(logLine)) log(`stdout: ${logLine}`);
        if (cfg.stdout?.failPattern?.test(logLine)) {
          failTest(`stdout fail match: ${logLine}`);
        }
      }
    })();
    process.ref();
    const inStream = process.stdin.getWriter();
    const textEncoder = new TextEncoder();
    cfg.debug ? alert('Ready to connect?') : await delay(100);
    let status: App['status'] = 'running';
    const getAppUrl = (path: string): URL => {
      if (!host) throw new Error(`Application has no port assigned!`);
      return new URL(path, host);
    };
    return {
      name: cfg.name,
      status,
      port,
      http: {
        fetch: (path, options) => fetch(path, options),
        async postJson(path, data, options) {
          const url = getAppUrl(path);
          const res = await fetch(url, {
            headers: { 'content-type': 'application/json' },
            method: 'POST',
            body: JSON.stringify(data),
            ...options,
          });
          const ct = res.headers.get('content-type');
          const json = ct?.includes('json') ? await res.json() : undefined;
          return { status: res.status, json };
        },
        async getText(path, options) {
          const url = getAppUrl(path);
          const res = await fetch(url, options);
          const text = await res.text();
          return { status: res.status, text };
        },
        async getJson(path, options) {
          const url = getAppUrl(path);
          const res = await fetch(url, options);
          const json = await res.json();
          return { status: res.status, json };
        },
      },
      websocket: {
        async connect(_handler) {
          // todo
          await delay(0);
          return {
            async send() {
            },
            async disconnect() {
            },
          };
        },
      },
      socket: {}, // todo
      stderr: {
        readLogs: () => stderrLogs.splice(0),
      },
      stdout: {
        readLogs: () => stdoutLogs.splice(0),
      },
      stdin: {
        writeBytes: (buf) => inStream.write(buf),
        writeText: (text) => inStream.write(textEncoder.encode(text)),
        writeTextLine: (text) =>
          inStream.write(new TextEncoder().encode(text + '\n')),
      },
      async end() {
        inStream.releaseLock();
        process.stdin.close();
        killSafely(process);
        await process.status;
        releasePort(port);
        status = 'exited';
      },
    };
  } catch (error) {
    console.error('Error while running the file: ', error);
    Deno.exit(4);
  }
};

const toPiped = (appPath: string, args: string[]) =>
  new Deno.Command(appPath, {
    args,
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
  });
const killSafely = (process: Deno.ChildProcess) => {
  try {
    process.kill();
  } catch (error) {
    if (error instanceof Error) {
      const isSafe = error.message.includes(
        'Child process has already terminated',
      );
      if (isSafe) return;
    }
    throw error;
  }
};
