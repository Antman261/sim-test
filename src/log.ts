import {
  blue,
  brightBlue,
  cyan,
  green,
  magenta,
  red,
  yellow,
} from '@std/fmt/colors';
import { crypto } from '@std/crypto';
import type { Kind } from './process/Kind.ts';

type AppColor = typeof appColors[number];
type ColorFunc = typeof blue;
const simColor = blue;
const appColors = [cyan, green, magenta, red, yellow] as const;
const appMap: Record<string, AppColor> = {};
/**
 * Deterministically assigns a color for an application name based on its hash, but without rehashing on every invocation
 */
const toAppColor = (name: string): ColorFunc => {
  if (appMap[name]) return appMap[name];
  const hashInt = new Uint8Array(
    crypto.subtle.digestSync('MD5', new TextEncoder().encode(name)),
  )[0];
  const color = appColors[hashInt % appColors.length];
  appMap[name] = color;
  return color;
};

export const makeLogger = (kind: Kind, id: number, name?: string) => {
  const hasId = id !== undefined;
  const nameWrapped = name ? `${kind}(${name})` : kind;
  const withColor = kind === 'app' ? toAppColor(nameWrapped) : simColor;
  const prefix = withColor(`${nameWrapped}${hasId ? `-${id}` : ''}:`);
  return Object.assign((...args: unknown[]) => console.log(prefix, ...args), {
    error: (...args: unknown[]) =>
      console.error(prefix, red('error:'), ...args),
  });
};

export const simLog = makeLogger('simulation', Deno.pid);
