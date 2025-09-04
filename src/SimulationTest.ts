import {
  type ClientApp,
  type ClientAppConfig,
  type ServerApp,
  type ServerConfig,
  startClientApp,
  startServerInstance,
} from './process/index.ts';

export type SimulationTestConfig = {
  servers: ServerConfig[];
  clients: ClientAppConfig[];
  keepTestServerOpen?: boolean;
};

export class SimulationTest {
  clientInstances: ClientApp[] = [];
  serverInstances: ServerApp[] = [];
  #config: SimulationTestConfig;
  constructor(config: SimulationTestConfig) {
    this.#config = config;
  }
  async start() {
    this.serverInstances = await Promise.all(
      this.#config.servers.map(startServerInstance),
    );
    this.clientInstances = await Promise.all(
      this.#config.clients.map((cfg, idx) => {
        const config = structuredClone(cfg);
        const circularIndex = idx % this.serverInstances.length;
        const svrPort = this.serverInstances[circularIndex]?.app.port;
        (config.appArgs ??= []).push(`--serverPort=${svrPort}`);
        return startClientApp(config);
      }),
    );
  }
  async cleanup() {
    await Promise.all(
      this.serverInstances
        .map((svr) => svr.app.end())
        .concat(this.clientInstances.map((client) => client.app.end())),
    );
  }
}
