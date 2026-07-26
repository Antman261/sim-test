import { delay } from '@std/async/delay';
import { isDefined, isTruthy } from '@antman/bool';

type Opts = {
  maxAttempts?: number;
  attemptIntervalMs?: number;
  message: string;
};

const getDefaults = () => ({
  maxAttempts: 5,
  attemptIntervalMs: 25,
  message: 'unknown',
});

type TestFunc = typeof isDefined | typeof isTruthy;
type TryUntil = <T extends unknown>(fn: () => T, opts?: Opts) => Promise<T>;
const makeTryUntil =
  <T extends TestFunc>(tester: T) =>
  async <T extends unknown>(fn: () => T, opts?: Opts): Promise<T> => {
    const { maxAttempts, attemptIntervalMs, message } = {
      ...getDefaults(),
      ...opts,
    };
    let attempts = 0;
    while (true) {
      attempts++;
      const result = await fn();
      if (attempts > maxAttempts) {
        throw new Error(`tryUntil attempts exhausted: ${message}`);
      }
      if (tester(result)) return result;
      await delay(attemptIntervalMs);
    }
  };

export const tryUntil: TryUntil = makeTryUntil(isDefined);
export const tryUntilDefined: TryUntil = tryUntil;
export const tryUntilTruthy: TryUntil = makeTryUntil(isTruthy);
