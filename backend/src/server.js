import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createRun,
  deactivateSubscription,
  findRunByToken,
  listActiveSubscriptions,
  upsertSubscription
} from './store.js';
import { sendRunNotification } from './push.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../pwa/public');

const PORT = Number(process.env.PORT ?? 3000);
const CODEX_NOTIFY_TOKEN = process.env.CODEX_NOTIFY_TOKEN ?? 'dev-token';

function jsonResponse(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function htmlResponse(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function serveStaticFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  const contentTypeMap = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png'
  };

  res.writeHead(200, {
    'Content-Type': contentTypeMap[ext] ?? 'application/octet-stream'
  });
  res.end(fs.readFileSync(filePath));
}

function renderRunPage(run) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${run.title}</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
      .chip { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 999px; background: #eef2ff; margin-bottom: 1rem; }
      dl { display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem 1rem; }
      dt { font-weight: 700; }
      pre { white-space: pre-wrap; background: #f8fafc; padding: 1rem; border-radius: 8px; }
    </style>
  </head>
  <body>
    <h1>${run.title}</h1>
    <div class="chip">Status: ${run.status}</div>
    <dl>
      <dt>Finished</dt><dd>${run.finishedAt}</dd>
      <dt>Thread</dt><dd>${run.threadId ?? 'n/a'}</dd>
      <dt>Client</dt><dd>${run.client ?? 'n/a'}</dd>
      <dt>Working Dir</dt><dd>${run.cwd ?? 'n/a'}</dd>
    </dl>
    <h2>Summary</h2>
    <pre>${run.summaryShort}</pre>
  </body>
</html>`;
}

async function handleCodexEvent(req, res) {
  const authHeader = req.headers.authorization ?? '';
  if (authHeader !== `Bearer ${CODEX_NOTIFY_TOKEN}`) {
    jsonResponse(res, 401, { ok: false, error: 'unauthorized' });
    return;
  }

  const body = await readBody(req);
  const run = createRun({
    title: body.title ?? 'Codex task finished',
    summaryShort: String(body.summary ?? '').slice(0, 240),
    status: body.status ?? 'completed',
    threadId: body.thread_id,
    cwd: body.cwd,
    client: body.client,
    raw: body.raw ?? body,
    finishedAt: new Date().toISOString()
  });

  const subscriptions = listActiveSubscriptions();
  for (const subscription of subscriptions) {
    try {
      await sendRunNotification(subscription, run);
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        deactivateSubscription(subscription.endpoint);
      }
    }
  }

  jsonResponse(res, 200, { ok: true, runToken: run.runToken });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/push/subscribe') {
      const body = await readBody(req);
      if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
        jsonResponse(res, 400, { ok: false, error: 'invalid subscription' });
        return;
      }
      const userAgent = req.headers['user-agent'];
      upsertSubscription({ ...body, userAgent });
      jsonResponse(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/codex/event') {
      await handleCodexEvent(req, res);
      return;
    }

    if (req.method === 'GET' && req.url?.startsWith('/r/')) {
      const runToken = req.url.split('/r/')[1];
      const run = findRunByToken(runToken);
      if (!run) {
        htmlResponse(res, 404, '<h1>Run not found</h1>');
        return;
      }
      htmlResponse(res, 200, renderRunPage(run));
      return;
    }

    if (req.method === 'GET' && req.url === '/') {
      serveStaticFile(res, path.join(publicDir, 'index.html'));
      return;
    }

    if (req.method === 'GET' && req.url === '/service-worker.js') {
      serveStaticFile(res, path.join(publicDir, 'service-worker.js'));
      return;
    }

    if (req.method === 'GET' && req.url === '/manifest.webmanifest') {
      serveStaticFile(res, path.join(publicDir, 'manifest.webmanifest'));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (error) {
    console.error(error);
    jsonResponse(res, 500, { ok: false, error: 'internal_error' });
  }
});

server.listen(PORT, () => {
  console.log(`Web push server listening on http://localhost:${PORT}`);
});
