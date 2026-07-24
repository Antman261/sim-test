import { makeSimTest } from '@antman/sim-test';
import { expect } from '@std/expect';

const withSim = makeSimTest({
  apps: [{
    name: 'cli',
    appPath: '/usr/bin/ssh',
    args: ['localhost'],
  }],
});

Deno.test(
  'Runs ssh using pty',
  withSim(async ({ simCtx }) => {
    const [ssh] = simCtx.apps;
    const [log] = await ssh.stderr.readLogs();
    expect(log).toEqual(
      'ssh: connect to host localhost port 22: Connection refused',
    );
  }),
);
