from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator


class EventBroker:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue] = set()

    async def publish(self, event: str, payload: dict) -> None:
        message = {"event": event, "payload": payload}
        for queue in tuple(self._subscribers):
            await queue.put(message)

    async def stream(self) -> AsyncIterator[str]:
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(queue)
        try:
            yield "event: connected\ndata: {}\n\n"
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=20)
                    yield f"event: update\ndata: {json.dumps(message)}\n\n"
                except TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            self._subscribers.discard(queue)


broker = EventBroker()
