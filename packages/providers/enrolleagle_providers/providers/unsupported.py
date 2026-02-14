from __future__ import annotations

from enrolleagle_providers.types import SeatStatus


class UnsupportedProvider:
    def __init__(self, provider_key: str, reason: str) -> None:
        self.provider_key = provider_key
        self.reason = reason

    def get_seat_status(self, payload: dict) -> SeatStatus:
        return SeatStatus(
            open_seats=None,
            waitlist_open_seats=None,
            status="UNSUPPORTED",
            source_url=payload.get("source_url"),
            raw_excerpt=None,
            block_reason=self.reason,
        )
