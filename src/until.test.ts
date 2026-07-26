import { expect } from '@std/expect';
import { tryUntil, tryUntilTruthy } from './until.ts';
import { delay } from '@std/async';

Deno.test('tryUntil tries again on undefined', async () => {
  let i = 0;
  const result = await tryUntil(async () => {
    i++;
    await delay(1);
    if (i < 3) return undefined;
    return 0;
  });
  expect(i).toStrictEqual(3);
  expect(result).toStrictEqual(0);
});

Deno.test('tryUntil succeeds on false', async () => {
  let i = 0;
  const result = await tryUntil(async () => {
    i++;
    await delay(1);
    if (i < 3) return undefined;
    return false;
  });
  expect(i).toStrictEqual(3);
  expect(result).toStrictEqual(false);
});

Deno.test('tryUntilTruthy tries again on false', async () => {
  let i = 0;
  const result = await tryUntilTruthy(async () => {
    i++;
    await delay(1);
    if (i === 1) return false;
    if (i < 3) return undefined;
    return 1;
  });
  expect(i).toStrictEqual(3);
  expect(result).toStrictEqual(1);
});
