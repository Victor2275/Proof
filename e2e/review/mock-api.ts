import { createServer } from 'node:http';
import { answer, REVIEW_TOKEN } from './api.ts';
import { server } from './fixtures.ts';

/*
 * The review server, for reviewers who walk the app live in a browser.
 *
 *   npm run review:api            (localhost:3001, where the dev build looks)
 *
 * Every request it cannot answer prints an UNMOCKED line. /ui-review watches
 * for them: a finding about a screen that hit one is not a finding.
 */

const PORT = Number(process.env.REVIEW_API_PORT ?? 3001);

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return void res.writeHead(204).end();

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  // The timer socket only opens for a signed-in account; refuse it quietly.
  if (url.pathname.startsWith('/socket.io')) return void res.writeHead(404).end();

  const method = req.method ?? 'GET';
  const authorized = req.headers.authorization === `Bearer ${REVIEW_TOKEN}`;
  const found = answer(method, url, authorized, server);
  if (!found) process.stdout.write(`UNMOCKED ${method} ${url.pathname}${url.search}\n`);
  const { status, body } = found ?? { status: 404, body: { error: 'Not found' } };
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
})
  .on('error', (err: NodeJS.ErrnoException) => {
    const reason = err.code === 'EADDRINUSE' ? `port ${PORT} is taken — stop the real server first` : err.message;
    process.stderr.write(`review API did not start: ${reason}\n`);
    process.exit(1);
  })
  .listen(PORT, () => process.stdout.write(`review API on http://localhost:${PORT}/api\n`));
