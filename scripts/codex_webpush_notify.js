#!/usr/bin/env node

const backendUrl = process.env.CODEX_NOTIFY_BACKEND_URL;
const token = process.env.CODEX_NOTIFY_TOKEN;

if (!backendUrl || !token) {
  console.error('CODEX_NOTIFY_BACKEND_URL and CODEX_NOTIFY_TOKEN are required.');
  process.exit(1);
}

const raw = process.argv[2];
if (!raw) {
  process.exit(0);
}

const event = JSON.parse(raw);
if (event.event !== 'agent-turn-complete') {
  process.exit(0);
}

const payload = {
  event: event.event,
  title: event.title || 'Codex task finished',
  summary: event.summary || '',
  status: event.status || 'completed',
  thread_id: event.thread_id,
  cwd: event.cwd,
  client: event.client,
  raw: event
};

const response = await fetch(`${backendUrl}/api/codex/event`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify(payload)
});

if (!response.ok) {
  const text = await response.text();
  console.error('Failed to send Codex event', response.status, text);
  process.exit(1);
}

console.log('Codex event delivered', response.status);
