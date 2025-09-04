import { expect } from '@std/expect';
import { makeSimTest, tryUntil } from '@antman/sim-env';
import { delay } from '@std/async';

const withSim = makeSimTest({
  clients: [{ entryPath: './test/client/main.ts' }],
  servers: [{ entryPath: './test/server/main.ts' }],
});

Deno.test(
  'Simulator runs the server',
  withSim(async ({ simCtx }) => {
    const { text } = await simCtx.serverInstances[0].getText('/');
    expect(text).toEqual('Hello Hono!');
  }),
);

Deno.test(
  'Client is interactive',
  withSim(async ({ simCtx }) => {
    const client = simCtx.clientInstances[0];
    await client.app.writeTextLine('/exit\n');
    await delay(200);
    expect(
      await tryUntil(() =>
        client.app.inspectLogs().at(-1) === 'Exiting chat app'
      ),
    ).toEqual(true);
  }),
);
