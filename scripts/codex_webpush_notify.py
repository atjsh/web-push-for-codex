#!/usr/bin/env python3
import json
import os
import sys
import urllib.request

BACKEND_URL = os.environ["CODEX_NOTIFY_BACKEND_URL"]
TOKEN = os.environ["CODEX_NOTIFY_TOKEN"]

def main() -> int:
    event = json.loads(sys.argv[1])
    if event.get("event") != "agent-turn-complete":
        return 0

    payload = {
        "event": event.get("event"),
        "title": event.get("title") or "Codex task finished",
        "summary": event.get("summary") or "",
        "status": event.get("status") or "completed",
        "thread_id": event.get("thread_id"),
        "cwd": event.get("cwd"),
        "client": event.get("client"),
        "finished_at": event.get("finished_at"),
        "raw": event,
    }

    req = urllib.request.Request(
        BACKEND_URL + "/api/codex/event",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TOKEN}",
        },
        method="POST",
    )

    with urllib.request.urlopen(req) as response:
        print(response.status)

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
