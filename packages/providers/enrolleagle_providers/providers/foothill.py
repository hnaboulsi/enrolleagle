from __future__ import annotations

import re

from selectolax.parser import HTMLParser

from enrolleagle_providers.block_detection import detect_blocked_response
from enrolleagle_providers.http import fetch_url
from enrolleagle_providers.types import SeatStatus

SEAT_PATTERNS = (
    re.compile(r"(\d+)\s+of\s+\d+\s+seats\s+open", re.IGNORECASE),
    re.compile(r"Seats\s+Available:\s*(\d+)\s+of\s+\d+", re.IGNORECASE),
    re.compile(r"Open\s+Seats:\s*(\d+)", re.IGNORECASE),
)
WAITLIST_PATTERNS = (
    re.compile(r"(\d+)\s+of\s+\d+\s+waitlist\s+seats\s+open", re.IGNORECASE),
    re.compile(r"Waitlist\s+Seats\s+Available:\s*(\d+)\s+of\s+\d+", re.IGNORECASE),
    re.compile(r"Open\s+Waitlist\s+Seats:\s*(\d+)", re.IGNORECASE),
)


def _extract_chunk(text: str, section_ref: str) -> str:
    marker_patterns = [
        re.compile(rf"(?:CRN|Course Number \(CRN\)|Class Number|Section#)\D*{re.escape(section_ref)}", re.IGNORECASE),
        re.compile(rf"\b{re.escape(section_ref)}\b", re.IGNORECASE),
    ]
    for pattern in marker_patterns:
        match = pattern.search(text)
        if match:
            start = max(0, match.start() - 400)
            end = min(len(text), match.end() + 1200)
            return text[start:end]
    return text[:2000]


def _find_int(patterns: tuple[re.Pattern[str], ...], text: str) -> int | None:
    for pattern in patterns:
        match = pattern.search(text)
        if match:
            return int(match.group(1))
    return None


def parse_foothill_html(html: str, section_ref: str) -> SeatStatus:
    text = HTMLParser(html).body.text(separator="\n") if HTMLParser(html).body else html
    chunk = _extract_chunk(text, section_ref)

    open_seats = _find_int(SEAT_PATTERNS, chunk)
    waitlist_open = _find_int(WAITLIST_PATTERNS, chunk)

    if open_seats is not None and open_seats > 0:
        status = "OPEN"
    elif waitlist_open is not None and waitlist_open > 0:
        status = "WAITLIST"
    elif "closed" in chunk.lower():
        status = "CLOSED"
    elif open_seats == 0:
        status = "FULL"
    else:
        status = "UNKNOWN"

    return SeatStatus(
        open_seats=open_seats,
        waitlist_open_seats=waitlist_open,
        status=status,
        source_url=None,
        raw_excerpt=chunk[:500],
        block_reason=None,
    )


class FoothillProvider:
    provider_key = "foothill"

    def get_seat_status(self, payload: dict) -> SeatStatus:
        section_ref = str(payload.get("section_ref", "")).strip()
        source_url = payload.get("source_url")
        if not section_ref:
            return SeatStatus(None, None, "UNSUPPORTED", source_url, None, "section_ref is required")
        if not source_url:
            return SeatStatus(None, None, "UNSUPPORTED", None, None, "source_url is required for v1 foothill parser")

        response = fetch_url(source_url)
        blocked, reason = detect_blocked_response(response.status_code, response.text, expected_tokens=("seats", "open"))
        if blocked:
            return SeatStatus(None, None, "BLOCKED", source_url, response.text[:500], reason)

        parsed = parse_foothill_html(response.text, section_ref)
        parsed.source_url = source_url

        if parsed.open_seats is None and parsed.waitlist_open_seats is None:
            blocked_like, blocked_reason = detect_blocked_response(
                response.status_code,
                response.text,
                expected_tokens=("seats", "waitlist"),
            )
            if blocked_like:
                parsed.status = "BLOCKED"
                parsed.block_reason = blocked_reason
            else:
                parsed.status = "UNSUPPORTED"
                parsed.block_reason = "Seat tokens not found for foothill parser."

        return parsed
