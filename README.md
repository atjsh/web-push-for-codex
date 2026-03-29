# Web Push for Codex (MVP)

This repository contains a minimal implementation of:

- `POST /api/push/subscribe`
- `POST /api/codex/event`
- `GET /r/:runToken`
- PWA service worker (`pwa/public/service-worker.js`)
- Local notify helper script (`scripts/codex_webpush_notify.py`)

## Run

```bash
npm install
CODEX_NOTIFY_TOKEN=dev-token npm start
```

Optional env vars:

- `PORT` (default `3000`)
- `DB_PATH` (default `backend/data.sqlite`)
- `BASE_URL` (default `http://localhost:$PORT`)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

## Codex notify hook

`~/.codex/config.toml`:

```toml
notify = ["python3", "/absolute/path/to/scripts/codex_webpush_notify.py"]
```

Set shell env vars on your Mac:

- `CODEX_NOTIFY_BACKEND_URL=https://your-host`
- `CODEX_NOTIFY_TOKEN=<same bearer token as backend>`
