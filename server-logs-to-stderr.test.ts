import { makeSimTest } from '@antman/sim-test';
import { expect } from '@std/expect';

const withSim = makeSimTest({
  apps: [{
    name: 'cli',
    appPath: Deno.execPath(),
    args: ['run', './test/client/main.ts'],
  }, {
    name: 'server',
    appPath: Deno.execPath(),
    port: 0,
    args: ['run', '--allow-net', './test/server/logsToStderr.ts'],
  }],
});

Deno.test(
  'Server that logs to stderr by default does not automatically fail test',
  withSim(async ({ simCtx }) => {
    const [_, server] = simCtx.apps;
    const { text } = await server.http.getText('/');
    expect(text).toEqual('Hello Hono!');
  }),
);
