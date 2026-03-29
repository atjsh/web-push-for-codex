# web-push-for-codex

Minimal implementation for Codex turn completion alerts delivered over Web Push to a PWA.

## Components

- `backend/src/server.js`: HTTP API with subscribe, event ingest, and run status page.
- `pwa/public/index.html`: PWA shell with enable-notifications flow.
- `pwa/public/service-worker.js`: push and notification click handling.
- `scripts/codex_webpush_notify.js`: local Codex notify hook script.
- `scripts/clear_tokens.js`: clears all push subscriptions from the database.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server listen port |
| `CODEX_NOTIFY_TOKEN` | `dev-token` | Bearer token for the `/api/codex/event` endpoint |
| `VAPID_PUBLIC_KEY` | _(empty)_ | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | _(empty)_ | VAPID private key for Web Push |
| `ALLOWED_UA_PATTERN` | `iPhone` | Regex pattern for allowed User-Agents. Non-matching requests get an empty 404. Set to empty string to allow all. |
| `CODEX_NOTIFY_BACKEND_URL` | _(required for notify script)_ | Backend URL used by `codex_webpush_notify.js` |

## Run

```bash
CODEX_NOTIFY_TOKEN=dev-token npm start
```

Then open `http://localhost:3000`.

## Subscription Management

Only one push subscription is allowed at a time. If a subscription already exists, new registrations are blocked (HTTP 409).

To clear existing subscriptions and allow a new device to register:

```bash
npm run clear-tokens
```
