import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import Database from 'better-sqlite3';
import webpush from 'web-push';

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.resolve('backend/data.sqlite');
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const EVENT_TOKEN = process.env.CODEX_NOTIFY_TOKEN || '';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
const schema = fs.readFileSync(path.resolve('backend/src/db/schema.sql'), 'utf8');
db.exec(schema);

const app = express();
app.use(express.json());
app.use('/static', express.static(path.resolve('pwa/public')));

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><html><body>
  <h1>Codex Push</h1>
  <p>Add this app to your home screen on iPhone, then enable notifications.</p>
  <button id="enable">Enable notifications</button>
  <script>
    const vapidKey = ${JSON.stringify(VAPID_PUBLIC_KEY)};
    function urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
    }

    document.getElementById('enable').addEventListener('click', async () => {
      const reg = await navigator.serviceWorker.register('/static/service-worker.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Permission denied');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub)
      });
      alert('Subscribed.');
    });
  </script></body></html>`);
});

app.post('/api/push/subscribe', (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ ok: false, error: 'Invalid push subscription payload' });
  }

  const stmt = db.prepare(`
    INSERT INTO subscriptions (endpoint, p256dh, auth, user_agent, active, updated_at)
    VALUES (@endpoint, @p256dh, @auth, @user_agent, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(endpoint)
    DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth, active=1,
      user_agent=excluded.user_agent, updated_at=CURRENT_TIMESTAMP
  `);
  stmt.run({
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: req.get('user-agent') || null
  });

  return res.json({ ok: true });
});

app.post('/api/codex/event', async (req, res) => {
  const auth = req.get('authorization') || '';
  if (!EVENT_TOKEN || auth !== `Bearer ${EVENT_TOKEN}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const payload = req.body || {};
  if (payload.event !== 'agent-turn-complete') {
    return res.json({ ok: true, ignored: true });
  }

  const runToken = crypto.randomBytes(16).toString('hex');
  const status = payload.status || 'completed';
  const finishedAt = payload.finished_at || new Date().toISOString();

  db.prepare(`
    INSERT INTO runs (
      run_token, event_type, title, status, summary_short,
      thread_id, cwd, client, raw_json, finished_at
    ) VALUES (
      @run_token, @event_type, @title, @status, @summary_short,
      @thread_id, @cwd, @client, @raw_json, @finished_at
    )
  `).run({
    run_token: runToken,
    event_type: payload.event,
    title: payload.title || 'Codex task finished',
    status,
    summary_short: payload.summary || '',
    thread_id: payload.thread_id || null,
    cwd: payload.cwd || null,
    client: payload.client || null,
    raw_json: JSON.stringify(payload),
    finished_at: finishedAt
  });

  const subscriptions = db.prepare('SELECT endpoint, p256dh, auth FROM subscriptions WHERE active = 1').all();
  const notifPayload = JSON.stringify({
    title: status === 'completed' ? 'Codex finished' : 'Codex needs attention',
    body: (payload.summary || 'Task completed').slice(0, 140),
    tag: `run:${runToken}`,
    url: `${BASE_URL}/r/${runToken}`
  });

  for (const sub of subscriptions) {
    const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
    try {
      await webpush.sendNotification(subscription, notifPayload);
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        db.prepare('UPDATE subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE endpoint = ?').run(sub.endpoint);
      }
    }
  }

  return res.json({ ok: true, runToken });
});

app.get('/r/:runToken', (req, res) => {
  const row = db.prepare(`
    SELECT run_token, title, status, summary_short, thread_id, cwd, client, finished_at
    FROM runs WHERE run_token = ?
  `).get(req.params.runToken);

  if (!row) {
    return res.status(404).type('html').send('<h1>Run not found</h1>');
  }

  return res.type('html').send(`<!doctype html><html><body>
  <h1>${escapeHtml(row.title)}</h1>
  <ul>
    <li>Status: ${escapeHtml(row.status)}</li>
    <li>Finished at: ${escapeHtml(row.finished_at)}</li>
    <li>Thread: ${escapeHtml(row.thread_id || 'n/a')}</li>
    <li>Working directory: ${escapeHtml(row.cwd || 'n/a')}</li>
    <li>Client: ${escapeHtml(row.client || 'n/a')}</li>
  </ul>
  <p>${escapeHtml(row.summary_short || '')}</p>
  </body></html>`);
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
