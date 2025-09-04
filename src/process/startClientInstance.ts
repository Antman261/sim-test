import { badSeed } from '../env/random.ts';
import { toDenoArgs } from './basicArgs.ts';
import { delay } from '@std/async/delay';
import { type AppInstance, initAppInstance } from './initAppInstance.ts';
import type { JsonResponse, Obj, TextResponse } from './types.ts';

export type ClientAppConfig = {
  name?: string;
  entryPath: string;
  seed?: number;
  debug?: boolean;
  appArgs?: string[];
};

export const defaultClientConfig = (): Required<
  Omit<ClientAppConfig, 'name'>
> => ({
  entryPath: './client/main.ts',
  debug: false,
  seed: badSeed(),
  appArgs: [],
});
export type ClientApp = {
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
export const startClientApp = async (
  opt?: ClientAppConfig,
): Promise<ClientApp> => {
  const opts = { ...defaultClientConfig(), ...opt };
  const { debug, seed, name, appArgs, entryPath } = opts;
  const denoArgs = toDenoArgs(opt);
  denoArgs.push(entryPath);
  appArgs.push(`--sim-seed=${seed}`);
  const args = denoArgs.concat(appArgs);

  const app = initAppInstance(args, 'client', { name });
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
