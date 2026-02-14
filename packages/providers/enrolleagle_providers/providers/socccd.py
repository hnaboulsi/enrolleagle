from __future__ import annotations

import re
from urllib.parse import urlparse

from selectolax.parser import HTMLParser

from enrolleagle_providers.block_detection import detect_blocked_response
from enrolleagle_providers.http import fetch_url
from enrolleagle_providers.types import SeatStatus

BASE_SEARCH_URL = "https://mysite.socccd.edu/eservices/ClassSearchForm.aspx"

SEAT_PATTERNS = (
    re.compile(r"Open\s+Seats:\s*(\d+)", re.IGNORECASE),
    re.compile(r"Seats\s+Available:\s*(\d+)\s+of\s+\d+", re.IGNORECASE),
)
WAITLIST_PATTERNS = (
    re.compile(r"Open\s+Waitlist\s+Seats:\s*(\d+)", re.IGNORECASE),
    re.compile(r"Waitlist:\s*(\d+)\s+of\s+\d+", re.IGNORECASE),
)


def _extract_chunk(text: str, section_ref: str) -> str:
    pattern = re.compile(rf"(?:Class\s+Number|CRN|Section#)\D*{re.escape(section_ref)}", re.IGNORECASE)
    match = pattern.search(text)
    if not match:
        loose = re.compile(rf"\b{re.escape(section_ref)}\b", re.IGNORECASE).search(text)
        match = loose
    if not match:
        return text[:2000]
    start = max(0, match.start() - 400)
    end = min(len(text), match.end() + 1200)
    return text[start:end]


def _find_int(patterns: tuple[re.Pattern[str], ...], text: str) -> int | None:
    for pattern in patterns:
        found = pattern.search(text)
        if found:
            return int(found.group(1))
    return None


def parse_socccd_html(html: str, section_ref: str) -> SeatStatus:
    parser = HTMLParser(html)
    text = parser.body.text(separator="\n") if parser.body else html
    chunk = _extract_chunk(text, section_ref)

    open_seats = _find_int(SEAT_PATTERNS, chunk)
    waitlist = _find_int(WAITLIST_PATTERNS, chunk)

    if open_seats is not None and open_seats > 0:
        status = "OPEN"
    elif waitlist is not None and waitlist > 0:
        status = "WAITLIST"
    elif "closed" in chunk.lower():
        status = "CLOSED"
    elif open_seats == 0:
        status = "FULL"
    else:
        status = "UNKNOWN"

    return SeatStatus(open_seats, waitlist, status, None, chunk[:500], None)


class SocccdProvider:
    provider_key = "socccd"

    def get_seat_status(self, payload: dict) -> SeatStatus:
        section_ref = str(payload.get("section_ref", "")).strip()
        term_ref = str(payload.get("term_ref") or "current")
        campus_code = str(payload.get("campus_code") or "ivc").lower()
        source_url = payload.get("source_url")

        if campus_code not in {"ivc", "saddleback"}:
            return SeatStatus(None, None, "UNSUPPORTED", source_url, None, "campus_code must be ivc or saddleback")

        if not section_ref:
            return SeatStatus(None, None, "UNSUPPORTED", source_url, None, "section_ref is required")

        target_url = source_url or (
            f"{BASE_SEARCH_URL}?campus={campus_code}&term={term_ref}&class={section_ref}"
        )

        response = fetch_url(target_url)
        blocked, reason = detect_blocked_response(
            response.status_code,
            response.text,
            expected_tokens=("seats", "open"),
            host=urlparse(target_url).netloc,
        )
        if blocked:
            return SeatStatus(None, None, "BLOCKED", target_url, response.text[:500], reason)

        parsed = parse_socccd_html(response.text, section_ref)
        parsed.source_url = target_url

        if parsed.open_seats is None and parsed.waitlist_open_seats is None:
            blocked_like, blocked_reason = detect_blocked_response(
                response.status_code,
                response.text,
                expected_tokens=("open seats", "class number"),
                host=urlparse(target_url).netloc,
            )
            if blocked_like:
                parsed.status = "BLOCKED"
                parsed.block_reason = blocked_reason
            else:
                parsed.status = "UNSUPPORTED"
                parsed.block_reason = "Seat tokens not found for socccd parser."

        return parsed
