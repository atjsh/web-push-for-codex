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

---

# web-push-for-codex (한국어)

Codex 작업 완료 알림을 Web Push를 통해 PWA로 전달하는 최소 구현체입니다.

## 구성 요소

- `backend/src/server.js`: 구독, 이벤트 수신, 실행 상태 페이지를 제공하는 HTTP API.
- `pwa/public/index.html`: 알림 활성화 플로우를 포함한 PWA 셸.
- `pwa/public/service-worker.js`: 푸시 수신 및 알림 클릭 처리.
- `scripts/codex_webpush_notify.js`: 로컬 Codex 알림 훅 스크립트.
- `scripts/clear_tokens.js`: 데이터베이스의 모든 푸시 구독을 삭제.

## 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `3000` | 서버 리스닝 포트 |
| `CODEX_NOTIFY_TOKEN` | `dev-token` | `/api/codex/event` 엔드포인트용 Bearer 토큰 |
| `VAPID_PUBLIC_KEY` | _(비어 있음)_ | Web Push용 VAPID 공개 키 |
| `VAPID_PRIVATE_KEY` | _(비어 있음)_ | Web Push용 VAPID 비공개 키 |
| `ALLOWED_UA_PATTERN` | `iPhone` | 허용할 User-Agent 정규식 패턴. 일치하지 않는 요청은 빈 404를 반환합니다. 빈 문자열로 설정하면 모두 허용. |
| `CODEX_NOTIFY_BACKEND_URL` | _(알림 스크립트에 필수)_ | `codex_webpush_notify.js`에서 사용하는 백엔드 URL |

## 실행

```bash
CODEX_NOTIFY_TOKEN=dev-token npm start
```

이후 `http://localhost:3000`을 열어 주세요.

## 구독 관리

한 번에 하나의 푸시 구독만 허용됩니다. 이미 구독이 존재하면 새 등록이 차단됩니다 (HTTP 409).

기존 구독을 삭제하고 새 기기를 등록하려면:

```bash
npm run clear-tokens
```
