import { parseArgs } from '@std/cli';
import { logger } from 'hono/logger';
import { Hono } from 'hono';

console.log('Starting server');

const { port } = parseArgs(Deno.args, { string: ['port'] });

const app = new Hono();
app.use(logger());
app.get('/', (c) => c.text('Hello Hono!'));

Deno.serve(
  {
    port: parseInt(port!, 10),
    onListen: ({ hostname }) =>
      console.log(`Listening on http://${hostname}:${port}`),
  },
  app.fetch,
);
