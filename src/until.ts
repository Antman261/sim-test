import { delay } from '@std/async/delay';
import { isDefined } from '@antman/bool';

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

export const tryUntil = async <
  T extends unknown,
>(fn: () => T, opts?: Opts): Promise<T> => {
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
    if (isDefined(result)) return result;
    await delay(attemptIntervalMs);
  }
};
