"""Lyzr agent client — the single place that knows the Lyzr HTTP contract.

Documented contract (v3 inference):
  POST {LYZR_CHAT_URL}
  headers: x-api-key, Content-Type: application/json
  body:    {user_id, agent_id, session_id, message}
  200 ->   {"response": "<text>", "module_outputs": {...}}
"""
import asyncio
import json
import logging
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx

from app.config import settings

logger = logging.getLogger("echovault.lyzr")

AGENT_ENV = {
    "manager": "LYZR_MANAGER_AGENT_ID",
    "summarizer": "LYZR_SUMMARIZER_AGENT_ID",
    "task_extractor": "LYZR_TASK_AGENT_ID",
    "memory_assistant": "LYZR_MEMORY_AGENT_ID",
}


@dataclass
class LyzrResult:
    ok: bool
    text: str = ""
    duration_ms: int = 0
    error_code: Optional[str] = None
    error_message: Optional[str] = None  # always safe to show to users
    status_code: Optional[int] = None


class LyzrService:
    def __init__(self) -> None:
        self._semaphore = asyncio.Semaphore(max(1, settings.LYZR_MAX_CONCURRENCY))

    def agent_id(self, agent_key: str) -> Optional[str]:
        return getattr(settings, AGENT_ENV[agent_key], None)

    def is_agent_configured(self, agent_key: str) -> bool:
        return bool(settings.LYZR_API_KEY and self.agent_id(agent_key))

    async def call_agent(self, agent_key: str, message: str, session_id: str,
                         user_id: str = settings.DEFAULT_USER_ID) -> LyzrResult:
        if not settings.LYZR_API_KEY or not self.agent_id(agent_key):
            missing = [v for v in ("LYZR_API_KEY", AGENT_ENV[agent_key]) if not getattr(settings, v, None)]
            return LyzrResult(ok=False, error_code="lyzr_not_configured",
                              error_message=f"Agent is not configured. Missing: {', '.join(missing)}.")

        payload = {"user_id": user_id, "agent_id": self.agent_id(agent_key),
                   "session_id": session_id, "message": message}
        headers = {"x-api-key": settings.LYZR_API_KEY, "Content-Type": "application/json"}
        start = time.perf_counter()

        async with self._semaphore:
            for attempt in (1, 2):
                try:
                    async with httpx.AsyncClient(timeout=settings.LYZR_TIMEOUT_SECONDS) as client:
                        resp = await client.post(settings.LYZR_CHAT_URL, headers=headers, json=payload)
                except httpx.TimeoutException:
                    return self._fail(start, "lyzr_timeout",
                                      f"Lyzr did not respond within {int(settings.LYZR_TIMEOUT_SECONDS)}s.")
                except httpx.HTTPError as e:
                    logger.warning("Lyzr network error agent=%s type=%s", agent_key, type(e).__name__)
                    return self._fail(start, "lyzr_network", "Could not reach the Lyzr API (network error).")

                if resp.status_code in (429, 502, 503, 504) and attempt == 1:
                    logger.info("Lyzr transient status=%s agent=%s, retrying once", resp.status_code, agent_key)
                    await asyncio.sleep(1.5)
                    continue
                break

        duration = int((time.perf_counter() - start) * 1000)
        if resp.status_code == 429:
            return LyzrResult(False, "", duration, "lyzr_rate_limited", "Lyzr rate limit reached. Try again shortly.", 429)
        if resp.status_code in (401, 403):
            return LyzrResult(False, "", duration, "lyzr_auth", "Lyzr rejected the API key or agent access.", resp.status_code)
        if resp.status_code == 404:
            return LyzrResult(False, "", duration, "lyzr_not_found", "Lyzr could not find this agent ID.", 404)
        if resp.status_code >= 400:
            logger.warning("Lyzr HTTP %s agent=%s", resp.status_code, agent_key)
            return LyzrResult(False, "", duration, "lyzr_http_error",
                              f"Lyzr returned HTTP {resp.status_code}.", resp.status_code)
        try:
            data = resp.json()
        except ValueError:
            return LyzrResult(False, "", duration, "lyzr_invalid_json", "Lyzr returned a non-JSON response.", resp.status_code)

        text = self._extract_text(data)
        if not text or not text.strip():
            return LyzrResult(False, "", duration, "lyzr_empty_response", "Lyzr returned an empty response.", resp.status_code)
        logger.info("Lyzr ok agent=%s %sms chars=%s", agent_key, duration, len(text))
        return LyzrResult(True, text.strip(), duration, status_code=resp.status_code)

    @staticmethod
    def _fail(start: float, code: str, msg: str) -> LyzrResult:
        return LyzrResult(False, "", int((time.perf_counter() - start) * 1000), code, msg)

    @staticmethod
    def _extract_text(data: Any) -> str:
        if isinstance(data, str):
            return data
        if isinstance(data, dict):
            for key in ("response", "message", "output", "answer"):
                v = data.get(key)
                if isinstance(v, str):
                    return v
                if isinstance(v, dict):
                    inner = LyzrService._extract_text(v)
                    if inner:
                        return inner
            if isinstance(data.get("data"), (dict, str)):
                return LyzrService._extract_text(data["data"])
        return ""


def extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    """Parse the first JSON object in an agent reply (handles ```json fences and surrounding prose)."""
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidates = [fenced.group(1)] if fenced else []
    start = text.find("{")
    while start != -1:
        depth = 0
        in_str = False
        esc = False
        for i in range(start, len(text)):
            ch = text[i]
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
                continue
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidates.append(text[start:i + 1])
                    break
        start = text.find("{", start + 1) if not candidates else -1
    for c in candidates:
        try:
            obj = json.loads(c)
            if isinstance(obj, dict):
                return obj
        except ValueError:
            continue
    return None


lyzr_service = LyzrService()
