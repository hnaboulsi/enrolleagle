"""De Anza College catalog-search adapter.

Thin wrapper around the Foothill search adapter — both colleges share
the FHDA district schedule system with the same HTML structure.
"""
from __future__ import annotations

from enrolleagle_providers.providers.foothill_search import (
    FoothillSearchAdapter,
)
from enrolleagle_providers.types import (
    CatalogSearchResult,
    SubjectInfo,
    TermInfo,
)


class DeAnzaSearchAdapter(FoothillSearchAdapter):
    school_id = "deanza"

    # De Anza uses the same FHDA term codes
    def get_terms(self) -> list[TermInfo]:
        return super().get_terms()

    def get_subjects(self, term_ref: str) -> list[SubjectInfo]:
        # De Anza shares the FHDA system — same subjects available
        return super().get_subjects(term_ref)

    def search_catalog(self, term_ref: str, subject_code: str) -> CatalogSearchResult:
        result = super().search_catalog(term_ref, subject_code)
        # Override school_id so it's tagged correctly
        result.school_id = self.school_id
        return result
