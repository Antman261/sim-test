import { type App, type AppConfig, startAppInstance } from './process/index.ts';

export type SimulationTestConfig = {
  apps: AppConfig[];
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
