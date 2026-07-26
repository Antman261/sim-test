import {
  makeTestFrame,
  type TestWrapper,
} from './src/harness/makeTestFrame.ts';
export { logRegex } from './src/process/index.ts';
import {
  type App,
  SimulationTest,
  type SimulationTestConfig,
} from './src/SimulationTest.ts';
export { tryUntilDefined, tryUntilTruthy } from './src/until.ts';
export type { App, SimulationTestConfig };

/**
 * Define the processes required for simulation testing, then use the returned test wrapper when defining test cases.
 *
 * For example:
 * ```
 * const withSim = makeSimTest({
 *   apps: [
 *    { name: 'client', appPath: Deno.execPath(), args: ['./test/client/main.ts'] },
 *    { name: 'server', appPath: Deno.execPath(), args: ['./test/server/main.ts'] },
 *   ],
 * });

 * Deno.test(
 *   'Client can message the server',
 *   withSim(async ({ simCtx }) => {
 *     const [ client, server ] = simCtx.apps;
 *     const { text } = await server.getText('/');
 *     expect(text).toEqual('Hello Hono!'); // server is running
 *     await client.writeTextLine('/ping-server');
 *     await tryUntil(() => client.readLogs().includes('Sending ping...'));
 *   }),
 *  );
 */
export const makeSimTest = (opt: SimulationTestConfig): TestWrapper => {
  const simCtx = new SimulationTest(opt);
  return makeTestFrame({
    beforeEach: () => simCtx.start(),
    afterEach: () => simCtx.cleanup(),
    simCtx,
  });
};
