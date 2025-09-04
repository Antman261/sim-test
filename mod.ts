import { makeTestFrame } from './src/harness/makeTestFrame.ts';
import { logRegex } from './src/process/initAppInstance.ts';
import {
  SimulationTest,
  type SimulationTestConfig,
} from './src/SimulationTest.ts';
import { tryUntil } from './src/until.ts';

export { logRegex, tryUntil };
export type { SimulationTestConfig };
/**
 * Define the processes required for simulation testing, then use the returned test wrapper when defining test cases.
 *
 * For example:
 * ```
 * const withSim = makeSimTest({
*    clients: [{ entryPath: './test/client/main.ts' }],
*    servers: [{ entryPath: './test/server/main.ts' }],
*  });

 * Deno.test(
 *   'Client can message the server',
 *   withSim(async ({ simCtx }) => {
 *     const [ server ] = simCtx.serverInstances;
 *     const [ client ] = simCtx.clientInstances;
 *     const { text } = await server.getText('/');
 *     expect(text).toEqual('Hello Hono!'); // server is running
 *     await client.writeTextLine('/ping-server');
 *     await tryUntil(() => client.app.inspectLogs().includes('Sending ping...'));
 *     expect());
 *   }),
 *  );
 */
export const makeSimTest = (opt: SimulationTestConfig) => {
  const simCtx = new SimulationTest(opt);
  return makeTestFrame({
    beforeEach: () => simCtx.start(),
    afterEach: () => simCtx.cleanup(),
    simCtx,
  });
};
