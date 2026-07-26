import { expect } from '@std/expect';
import { makeSimTest, tryUntilDefined } from '@antman/sim-test';
import { delay } from '@std/async';

const withSim = makeSimTest({
  apps: [{
    name: 'cli',
    appPath: Deno.execPath(),
    args: ['run', './test/client/main.ts'],
  }, {
    name: 'server',
    appPath: Deno.execPath(),
    port: 0,
    args: ['run', '--allow-net', './test/server/main.ts'],
  }],
});

Deno.test(
  'Simulator runs the server',
  withSim(async ({ simCtx }) => {
    const [_, server] = simCtx.apps;
    const { text } = await server.http.getText('/');
    expect(text).toEqual('Hello Hono!');
  }),
);

Deno.test(
  'Client is interactive',
  withSim(async ({ simCtx }) => {
    const [client] = simCtx.apps;
    await client.stdin.writeTextLine('/exit\n');
    await delay(200);
    expect(
      await tryUntilDefined(() =>
        client.stdout.readLogs().at(-1) === 'Exiting chat app'
      ),
    ).toEqual(true);
  }),
);
