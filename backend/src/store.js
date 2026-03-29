import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('backend/data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ subscriptions: [], runs: [] }, null, 2),
      'utf8'
    );
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeStore(data) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function upsertSubscription(subscription) {
  const data = readStore();
  const now = new Date().toISOString();
  const index = data.subscriptions.findIndex((item) => item.endpoint === subscription.endpoint);

  const record = {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    expirationTime: subscription.expirationTime ?? null,
    userAgent: subscription.userAgent ?? 'unknown',
    active: true,
    updatedAt: now,
    createdAt: index === -1 ? now : data.subscriptions[index].createdAt
  };

  if (index === -1) {
    data.subscriptions.push(record);
  } else {
    data.subscriptions[index] = record;
  }

  writeStore(data);
  return record;
}

export function createRun(runInput) {
  const data = readStore();
  const run = {
    id: crypto.randomUUID(),
    runToken: crypto.randomUUID().replaceAll('-', ''),
    title: runInput.title,
    summaryShort: runInput.summaryShort,
    status: runInput.status,
    threadId: runInput.threadId ?? null,
    cwd: runInput.cwd ?? null,
    client: runInput.client ?? null,
    raw: runInput.raw ?? null,
    finishedAt: runInput.finishedAt ?? new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  data.runs.push(run);
  writeStore(data);
  return run;
}

export function listActiveSubscriptions() {
  const data = readStore();
  return data.subscriptions.filter((item) => item.active);
}

export function deactivateSubscription(endpoint) {
  const data = readStore();
  const index = data.subscriptions.findIndex((item) => item.endpoint === endpoint);
  if (index >= 0) {
    data.subscriptions[index].active = false;
    data.subscriptions[index].updatedAt = new Date().toISOString();
    writeStore(data);
  }
}

export function findRunByToken(runToken) {
  const data = readStore();
  return data.runs.find((item) => item.runToken === runToken) ?? null;
}
