import { delay } from '@std/async/delay';
import { isDefined, isTruthy } from '@antman/bool';

type Opts = {
  /** The number of attempts before failing and throwing  */
  maxAttempts?: number;
  /** Number of milliseconds to wait between attempts */
  attemptIntervalMs?: number;
  /** This message will be included in the thrown error on failure. Useful for identifying test failures */
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

/** Repeatedly executes the provided function until it returns a defined value */
export const tryUntilDefined: TryUntil = makeTryUntil(isDefined);
/** Repeatedly executes the provided function until it returns a truthy value */
export const tryUntilTruthy: TryUntil = makeTryUntil(isTruthy);
