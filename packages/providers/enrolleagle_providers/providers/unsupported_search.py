"""Search adapter for schools that don't support catalog search yet."""
from __future__ import annotations

from enrolleagle_providers.types import (
    CatalogSearchResult,
    SubjectInfo,
    TermInfo,
)


class UnsupportedSearchAdapter:
    def __init__(self, school_id: str, reason: str) -> None:
        self.school_id = school_id
        self.reason = reason

    def get_terms(self) -> list[TermInfo]:
        return []

    def get_subjects(self, term_ref: str) -> list[SubjectInfo]:
        return []

    def search_catalog(self, term_ref: str, subject_code: str) -> CatalogSearchResult:
        return CatalogSearchResult(
            school_id=self.school_id,
            term_ref=term_ref,
            subject_code=subject_code,
            items=[],
        )
