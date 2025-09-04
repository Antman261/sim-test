import { makeSimTest } from '@antman/sim-test';
import { expect } from '@std/expect';

const withSim = makeSimTest({
  clients: [{ name: 'cli', entryPath: './test/client/main.ts' }],
  servers: [{ entryPath: './test/server/logsToStderr.ts' }],
});

Deno.test(
  'Server that logs to stderr by default does not automatically fail test',
  withSim(async ({ simCtx }) => {
    const { text } = await simCtx.serverInstances[0].getText('/');
    expect(text).toEqual('Hello Hono!');
  }),
);
