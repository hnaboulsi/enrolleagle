from __future__ import annotations

from dataclasses import dataclass, field
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


# ---------------------------------------------------------------------------
# Seat-check types (existing)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Catalog-search types (new)
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class MeetingTime:
    days: str | None
    start: str | None
    end_time: str | None
    location: str | None
    modality: str | None


@dataclass(slots=True)
class SectionResult:
    section_id: str              # stable ID used for watching (e.g. "CRN:12345")
    section_label: str           # human-friendly label, e.g. "CRN 12345 / Section 01"
    meeting_times: list[MeetingTime] = field(default_factory=list)
    instructor: str | None = None
    status: ProviderStatus = "UNKNOWN"
    open_seats: int | None = None
    waitlist_open_seats: int | None = None
    source_url: str | None = None
    block_reason: str | None = None


@dataclass(slots=True)
class CourseResult:
    course_code: str             # e.g. "CS 2A"
    course_title: str
    units: str | None = None
    sections: list[SectionResult] = field(default_factory=list)


@dataclass(slots=True)
class CatalogSearchResult:
    school_id: str
    term_ref: str
    subject_code: str
    items: list[CourseResult] = field(default_factory=list)


@dataclass(slots=True)
class SchoolInfo:
    id: str
    name: str
    supports_search: bool
    supports_seat_check: bool
    notes: str | None = None


@dataclass(slots=True)
class TermInfo:
    term_ref: str
    label: str


@dataclass(slots=True)
class SubjectInfo:
    subject_code: str
    subject_name: str


class SearchProvider(Protocol):
    school_id: str

    def get_terms(self) -> list[TermInfo]:
        ...

    def get_subjects(self, term_ref: str) -> list[SubjectInfo]:
        ...

    def search_catalog(self, term_ref: str, subject_code: str) -> CatalogSearchResult:
        ...
