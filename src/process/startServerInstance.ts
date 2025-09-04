import { delay } from '@std/async';
import { badSeed } from '../env/random.ts';
import { type AppInstance, initAppInstance } from './initAppInstance.ts';
import { toDenoArgs } from './basicArgs.ts';
import type { JsonResponse, Obj, TextResponse } from './types.ts';

export type ServerConfig = {
  name?: string;
  entryPath: string;
  debug?: boolean;
  otel?: boolean;
  seed?: number;
};
export type ServerApp = {
  app: AppInstance;
  sendRequest(path: string, options?: RequestInit): Promise<Response>;
  getText(path: string, options?: RequestInit): Promise<TextResponse>;
  get(path: string, options?: RequestInit): Promise<JsonResponse>;
  post<T extends Obj = Obj>(
    path: string,
    data: Obj,
    options?: RequestInit,
  ): Promise<JsonResponse<T>>;
};

export const defaultServerConfig = (): Required<
  Omit<ServerConfig, 'name'>
> => ({
  entryPath: './server/main.ts',
  debug: false,
  otel: false,
  seed: badSeed(),
});

const verifyOptions = (opt: ServerConfig | undefined): Required<ServerConfig> =>
  Object.assign(defaultServerConfig(), opt) as Required<ServerConfig>;

export const startServerInstance = async (
  opt?: ServerConfig,
): Promise<ServerApp> => {
  const { debug, seed, entryPath } = verifyOptions(opt);
  const args = toDenoArgs(opt);

  args.push(entryPath, `--sim-seed=${seed}`);

  const app = initAppInstance(args, 'server');
  const host = `http://localhost:${app.port}/`;

  debug ? alert('Ready to connect?') : await delay(100);
  return {
    app,
    sendRequest: (path, options) => fetch(new URL(path, host), options),
    async getText(path, options) {
      const res = await fetch(new URL(path, host), options);
      const text = await res.text();
      return { status: res.status, text };
    },
    async get(path, options) {
      const res = await fetch(new URL(path, host), options);
      const json = await res.json();
      return { status: res.status, json };
    },
    async post(path, data, options) {
      const res = await fetch(new URL(path, host), {
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(data),
        ...options,
      });
      const ct = res.headers.get('content-type');
      const json = ct?.includes('json') ? await res.json() : undefined;
      return { status: res.status, json };
    },
  };
};
