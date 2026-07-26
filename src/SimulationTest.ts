import { type App, type AppConfig, startAppInstance } from './process/index.ts';

/** Configure the simulation test */
export type SimulationTestConfig = {
  /** An array of apps (processes) running as part of the test */
  apps: AppConfig[];
  /** When set, apps will be left running at the end of the test. This can be useful for manual testing and investigation.  */
  keepTestServerOpen?: boolean;
};

export class SimulationTest {
  apps: App[] = [];
  #config: SimulationTestConfig;
  constructor(config: SimulationTestConfig) {
    this.#config = config;
  }
  async start() {
    this.apps = await Promise.all(this.#config.apps.map(startAppInstance));
  }
  async cleanup() {
    await Promise.all(this.apps.map((svr) => svr.end()));
  }
}

export type { App };
