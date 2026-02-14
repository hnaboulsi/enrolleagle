from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

ProviderStatus = Literal[
    "OPEN",
    "WAITLIST",
    "FULL",
    "CLOSED",
    "UNKNOWN",
    "BLOCKED",
    "UNSUPPORTED",
]


@dataclass(slots=True)
class SeatStatus:
    open_seats: int | None
    waitlist_open_seats: int | None
    status: ProviderStatus
    source_url: str | None
    raw_excerpt: str | None
    block_reason: str | None


class SeatProvider(Protocol):
    def get_seat_status(self, payload: dict) -> SeatStatus:
        ...
