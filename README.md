# web-push-for-codex

Minimal implementation for Codex turn completion alerts delivered over Web Push to a PWA.

## Components

- `backend/src/server.js`: HTTP API with subscribe, event ingest, and run status page.
- `pwa/public/index.html`: PWA shell with enable-notifications flow.
- `pwa/public/service-worker.js`: push and notification click handling.
- `scripts/codex_webpush_notify.js`: local Codex notify hook script.

## Run

```bash
CODEX_NOTIFY_TOKEN=dev-token npm start
```

Then open `http://localhost:3000`.
