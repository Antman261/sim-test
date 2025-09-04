import { TextLineStream } from '@std/streams';
import { makeLogger, simLog } from '../log.ts';
import type { Kind } from './Kind.ts';
import { releasePort, requestPort } from './portManager.ts';
import { failTest } from '../harness/index.ts';
import { mergeDeep } from '../util/deepMerge.ts';

export type AppInstance = {
  process: Deno.ChildProcess;
  port: number;
  readonly status: 'starting' | 'running' | 'exited';
  inspectLogs(): string[];
  writeBytes(buf: Uint8Array): Promise<void>;
  writeText(text: string): Promise<void>;
  writeTextLine(text: string): Promise<void>;
  end(): Promise<void>;
};

type LogOptions = { logPattern?: RegExp; failPattern?: RegExp };

export type AppInstanceOptions = {
  name?: string;
  stderr?: LogOptions;
  stdout?: LogOptions;
};

/**
 * Enum of common log pattern regexes. Useful when defining custom log or failure patterns
 */
export const logRegex = {
  matchAll: /./g,
  matchNothing: /[^\d\D]/g,
  matchError: /error/,
} as const;

const getDefault = (): Required<
  Omit<AppInstanceOptions, 'name'>
> => ({
  stderr: { logPattern: logRegex.matchAll, failPattern: logRegex.matchError },
  stdout: { logPattern: logRegex.matchAll, failPattern: logRegex.matchNothing },
} as const satisfies AppInstanceOptions);

export const initAppInstance = (
  args: string[],
  kind: Kind,
  options: AppInstanceOptions = {},
): AppInstance => {
  const opts = mergeDeep(options, getDefault());
  const port = requestPort();
  args.push(`--port=${port}`);
  simLog(`Starting ${kind} with cmd: deno ${args.join(' ')}`);
  try {
    const process = toPipedDeno(args).spawn();
    const log = makeLogger(kind, process.pid, opts.name);
    const logs: string[] = [];

    (async () => {
      for await (
        const logLine of process.stderr
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new TextLineStream())
      ) {
        if (opts.stderr?.logPattern?.test(logLine)) log.error(logLine);
        if (opts.stderr?.failPattern?.test(logLine)) {
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
        logs.push(logLine);
        if (opts.stdout?.logPattern?.test(logLine)) log(logLine);
        if (opts.stdout?.failPattern?.test(logLine)) {
          failTest(`stdout fail match: ${logLine}`);
        }
      }
    })();
    process.ref();
    const inStream = process.stdin.getWriter();
    const textEncoder = new TextEncoder();
    let status: AppInstance['status'] = 'running';
    return {
      process,
      status,
      port,
      inspectLogs: () => logs.splice(0),
      writeBytes: (buf: Uint8Array) => inStream.write(buf),
      writeText: (text) => inStream.write(textEncoder.encode(text)),
      writeTextLine: (text) =>
        inStream.write(new TextEncoder().encode(text + '\n')),
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

const toPipedDeno = (args: string[]) =>
  new Deno.Command(Deno.execPath(), {
    args,
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
  });
