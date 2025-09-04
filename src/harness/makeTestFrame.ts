import { mockSessionAsync } from '@std/testing/mock';
import type { SimulationTest } from '../SimulationTest.ts';
import {
  checkForFailure,
  markTestRunning,
  markTestStopped,
} from './failureInjector.ts';

type TestContext = {
  denoCtx: Deno.TestContext;
  simCtx: SimulationTest;
  onEnd(fn: FrameCleaner): void;
};
export type TestFunc = (ctx: TestContext) => Promise<void>;
type DenoTestFunc = (ctx: Deno.TestContext) => Promise<void>;
type FrameFunc = () => unknown | Promise<unknown>;
type FrameCleaner = () => Promise<unknown | void>;
type FrameOpt = {
  beforeEach?: FrameFunc;
  afterEach?: FrameFunc;
  beforeAll?: FrameFunc;
  simCtx: SimulationTest;
};
export type TestWrapper = (runTest: TestFunc) => DenoTestFunc;

const makeCleaner = () => {
  const cleanups: FrameCleaner[] = [];
  const onEnd = (cleaner: FrameCleaner) => {
    cleanups.push(cleaner);
  };
  const cleanUp = () => Promise.all(cleanups.map((fn) => fn()));
  return { onEnd, cleanUp };
};

export const makeTestFrame = (opt: FrameOpt): TestWrapper => {
  opt?.beforeAll?.();
  return (runTest: TestFunc): DenoTestFunc => async (denoCtx) => {
    const { onEnd, cleanUp } = makeCleaner();
    try {
      await mockSessionAsync(async () => {
        markTestRunning();
        await opt?.beforeEach?.();
        await runTest({ denoCtx, simCtx: opt?.simCtx, onEnd });
        checkForFailure();
        markTestStopped();
      })();
    } finally {
      await cleanUp();
      await opt?.afterEach?.();
    }
  };
};
