from __future__ import annotations

from typing import Iterable

BLOCK_MARKERS = (
    "cf-chl",
    "just a moment",
    "attention required",
    "cloudflare",
)

CHALLENGE_HINTS = (
    "enable javascript",
    "captcha",
    "ray id",
    "checking your browser",
)


def detect_blocked_response(
    status_code: int,
    html: str,
    expected_tokens: Iterable[str] | None = None,
    host: str | None = None,
) -> tuple[bool, str | None]:
    if status_code in {403, 429}:
        host_label = host or "host"
        return True, f"Blocked by {host_label} with HTTP {status_code}"

    lower = html.lower()
    for marker in BLOCK_MARKERS:
        if marker in lower:
            return True, f"Detected challenge marker: {marker}"

    if expected_tokens:
        has_expected = any(token.lower() in lower for token in expected_tokens)
        looks_like_gate = any(hint in lower for hint in CHALLENGE_HINTS)
        if (not has_expected) and looks_like_gate:
            return True, "Expected seat tokens missing and response looks challenge-gated"

    return False, None
