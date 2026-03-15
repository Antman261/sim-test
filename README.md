# @antman/sim-test

A deterministic simulation testing framework where the system under test is one
or more application processes. For example,

- a terminal client and a server
- a database and an application
- a primary database, a replica, and multiple applications handling many
  requests

## Usage

```ts
import { expect } from '@std/expect';
import { makeSimTest, tryUntil } from '@antman/sim-test';
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
    expect(
      await tryUntil(() =>
        client.stdout.readLogs().at(-1) === 'Exiting chat app'
      ),
    ).toEqual(true);
  }),
);
```
