import { blue, brightBlue, cyan, red } from '@std/fmt/colors';
import type { Kind } from './process/Kind.ts';

const colors = {
  simulation: blue,
  server: cyan,
  client: brightBlue,
} as const satisfies Record<Kind, typeof blue>;

export const makeLogger = (kind: Kind, id: number, name?: string) => {
  const hasId = id !== undefined;
  const nameWrapped = name ? `${kind}(${name})` : kind;
  const prefix = colors[kind](`${nameWrapped}${hasId ? `-${id}` : ''}:`);
  return Object.assign((...args: unknown[]) => console.log(prefix, ...args), {
    error: (...args: unknown[]) =>
      console.error(prefix, red('error:'), ...args),
  });
};

export const simLog = makeLogger('simulation', Deno.pid);
