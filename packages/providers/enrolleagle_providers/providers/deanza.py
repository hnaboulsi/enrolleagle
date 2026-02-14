from __future__ import annotations

from urllib.parse import urlparse

from enrolleagle_providers.block_detection import detect_blocked_response
from enrolleagle_providers.http import fetch_url
from enrolleagle_providers.providers.foothill import parse_foothill_html
from enrolleagle_providers.types import SeatStatus


class DeAnzaProvider:
    provider_key = "deanza"

    def get_seat_status(self, payload: dict) -> SeatStatus:
        source_url = payload.get("source_url")
        section_ref = str(payload.get("section_ref", "")).strip()

        if not source_url:
            return SeatStatus(None, None, "UNSUPPORTED", None, None, "pasted schedule URL is required for deanza v1")
        if not section_ref:
            return SeatStatus(None, None, "UNSUPPORTED", source_url, None, "section_ref is required")

        response = fetch_url(source_url)
        blocked, reason = detect_blocked_response(
            response.status_code,
            response.text,
            expected_tokens=("seats", "section"),
            host=urlparse(source_url).netloc,
        )
        if blocked:
            return SeatStatus(None, None, "BLOCKED", source_url, response.text[:500], reason)

        parsed = parse_foothill_html(response.text, section_ref)
        parsed.source_url = source_url

        if parsed.open_seats is None and parsed.waitlist_open_seats is None:
            blocked_like, blocked_reason = detect_blocked_response(
                response.status_code,
                response.text,
                expected_tokens=("seats", "waitlist"),
                host=urlparse(source_url).netloc,
            )
            if blocked_like:
                parsed.status = "BLOCKED"
                parsed.block_reason = blocked_reason
            else:
                parsed.status = "UNSUPPORTED"
                parsed.block_reason = "Unable to parse deanza schedule URL."

        return parsed
