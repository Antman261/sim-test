import { isDefined } from '@antman/bool';

let failure: string | undefined;
let running = false;

export const checkForFailure = () => {
  if (isDefined(failure) && running) throw new Error(failure);
};

export const markTestRunning = () => {
  running = true;
  failure = undefined;
};
export const markTestStopped = () => running = false;
export const failTest = (reason: string) => failure = reason;
