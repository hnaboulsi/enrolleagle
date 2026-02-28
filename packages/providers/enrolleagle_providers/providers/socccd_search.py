"""SOCCCD (Irvine Valley / Saddleback) catalog-search adapter.

Scrapes the legacy eServices class search at mysite.socccd.edu which
uses a traditional ASP form that returns HTML tables.
"""
from __future__ import annotations

import re
from urllib.parse import urlencode

from selectolax.parser import HTMLParser

from enrolleagle_providers.http import fetch_url
from enrolleagle_providers.types import (
    CatalogSearchResult,
    CourseResult,
    MeetingTime,
    SectionResult,
    SubjectInfo,
    TermInfo,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SEARCH_FORM_URL = "https://mysite.socccd.edu/eservices/ClassSearchForm.asp"
CLASS_FIND_URL = "https://mysite.socccd.edu/eservices/ClassFind.asp"

SITE_IDS = {"ivc": "I", "saddleback": "S"}

_CACHED_SUBJECTS: dict[str, list[SubjectInfo]] | None = None

CRN_RE = re.compile(r"\b(\d{4,6})\b")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _scrape_subjects_from_form(campus: str) -> list[SubjectInfo]:
    """Fetch the search form and extract subjects from the dropdown."""
    site_id = SITE_IDS.get(campus, "C")
    url = f"{SEARCH_FORM_URL}?mode=open&siteID={site_id}"
    response = fetch_url(url, retries=2)
    tree = HTMLParser(response.text)
    subjects: list[SubjectInfo] = []
    subject_select = tree.css_first("select[name='subject']")
    if not subject_select:
        return subjects
    for option in subject_select.css("option"):
        text = (option.text(deep=True) or "").strip()
        value = (option.attributes.get("value") or "").strip()
        if not text or not value or value.lower() == "any" or "select" in text.lower():
            continue
        subjects.append(SubjectInfo(subject_code=value, subject_name=text))
    # Deduplicate
    seen: set[str] = set()
    unique: list[SubjectInfo] = []
    for s in subjects:
        if s.subject_code not in seen:
            seen.add(s.subject_code)
            unique.append(s)
    return unique


def _scrape_terms_from_form(campus: str) -> list[TermInfo]:
    # Term dropdown is only populated when siteID=C
    url = f"{SEARCH_FORM_URL}?mode=open&siteID=C"
    response = fetch_url(url, retries=2)
    tree = HTMLParser(response.text)
    terms: list[TermInfo] = []
    term_select = tree.css_first("select[name='semid']")
    if not term_select:
        return terms
    for option in term_select.css("option"):
        value = (option.attributes.get("value") or "").strip()
        label = (option.text(deep=True) or "").strip()
        if not value or "select" in label.lower():
            continue
        terms.append(TermInfo(term_ref=value, label=label))
    return terms


def _parse_results_html(html: str, school_id: str, term_ref: str, subject_code: str) -> CatalogSearchResult:
    """Parse SOCCCD eServices search results HTML into normalized results."""
    tree = HTMLParser(html)
    text_content = tree.body.text(separator="\n") if tree.body else html
    courses: list[CourseResult] = []
    current_course: CourseResult | None = None

    # SOCCCD results are typically table rows with class data
    for row in tree.css("tr"):
        cells = row.css("td")
        row_text = row.text(deep=True) or ""

        # Skip header rows
        if row.css("th"):
            continue

        # Look for course header rows (bold text with course code)
        bold = row.css("b, strong")
        if bold:
            bold_text = bold[0].text(deep=True) or ""
            course_match = re.match(
                r"([A-Z][A-Z &]{0,10}\d+[A-Z]?)\s*[-–:]?\s*(.+)",
                bold_text.strip(),
                re.I,
            )
            if course_match:
                current_course = CourseResult(
                    course_code=course_match.group(1).strip(),
                    course_title=course_match.group(2).strip(),
                )
                courses.append(current_course)
                continue

        # Try to extract section data from table cells
        if len(cells) >= 3:
            cell_texts = [(c.text(deep=True) or "").strip() for c in cells]
            # Look for a CRN-like number in the first few cells
            crn = None
            for ct in cell_texts[:3]:
                crn_m = CRN_RE.search(ct)
                if crn_m:
                    crn = crn_m.group(1)
                    break

            if crn:
                if current_course is None:
                    current_course = CourseResult(
                        course_code=subject_code,
                        course_title="Unknown Course",
                    )
                    courses.append(current_course)

                # Extract meeting times from cell text
                meetings: list[MeetingTime] = []
                days_match = re.search(
                    r"((?:M|T|W|Th|F|Sa|Su)+)\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)",
                    row_text,
                    re.I,
                )
                if days_match:
                    meetings.append(MeetingTime(
                        days=days_match.group(1),
                        start=days_match.group(2).strip(),
                        end_time=days_match.group(3).strip(),
                        location=None,
                        modality=None,
                    ))

                # Extract seat info
                open_seats = None
                waitlist_seats = None
                seat_m = re.search(r"Open\s+Seats?:\s*(\d+)", row_text, re.I)
                if seat_m:
                    open_seats = int(seat_m.group(1))
                wait_m = re.search(r"(?:Open\s+)?Waitlist\s+Seats?:\s*(\d+)", row_text, re.I)
                if wait_m:
                    waitlist_seats = int(wait_m.group(1))

                if open_seats is not None and open_seats > 0:
                    status = "OPEN"
                elif waitlist_seats is not None and waitlist_seats > 0:
                    status = "WAITLIST"
                elif open_seats == 0:
                    status = "FULL"
                elif "closed" in row_text.lower():
                    status = "CLOSED"
                else:
                    status = "UNKNOWN"

                # Instructor
                instructor = None
                inst_match = re.search(r"(?:Instructor|Staff):\s*(.+?)(?:\n|$)", row_text)
                if not inst_match:
                    # Try last cell which often has instructor name
                    for ct in reversed(cell_texts):
                        if ct and not ct.isdigit() and len(ct) > 3 and not re.match(r"^\d", ct):
                            instructor = ct
                            break

                section = SectionResult(
                    section_id=f"CRN:{crn}",
                    section_label=f"CRN {crn}",
                    meeting_times=meetings,
                    instructor=instructor,
                    status=status,
                    open_seats=open_seats,
                    waitlist_open_seats=waitlist_seats,
                    source_url=None,
                    block_reason=None,
                )
                current_course.sections.append(section)

    return CatalogSearchResult(
        school_id=school_id,
        term_ref=term_ref,
        subject_code=subject_code,
        items=courses,
    )


# ---------------------------------------------------------------------------
# Public adapter
# ---------------------------------------------------------------------------

class SocccdSearchAdapter:
    school_id = "socccd"

    def __init__(self, campus: str = "ivc") -> None:
        self.campus = campus
        self.site_id = SITE_IDS.get(campus, "I")

    def get_terms(self) -> list[TermInfo]:
        try:
            return _scrape_terms_from_form(self.campus)
        except Exception:
            return []

    def get_subjects(self, term_ref: str) -> list[SubjectInfo]:
        global _CACHED_SUBJECTS
        key = f"{self.campus}:{term_ref}"
        if _CACHED_SUBJECTS is None:
            _CACHED_SUBJECTS = {}
        if key not in _CACHED_SUBJECTS:
            try:
                _CACHED_SUBJECTS[key] = _scrape_subjects_from_form(self.campus)
            except Exception:
                _CACHED_SUBJECTS[key] = []
        return _CACHED_SUBJECTS.get(key, [])

    def search_catalog(self, term_ref: str, subject_code: str) -> CatalogSearchResult:
        params = {
            "mode": "open",
            "siteid": self.site_id,
            "college": self.site_id,
            "semid": term_ref,
            "subject": subject_code,
        }
        url = f"{CLASS_FIND_URL}?{urlencode(params)}"
        response = fetch_url(url, retries=2)

        # As of 2026, SOC CCD redirects to SmartSchedule (JS-heavy) for results.
        if "smartscheduleweb" in str(response.url):
            raise RuntimeError("SOCCCD search is blocked (SmartSchedule is JS-only).")

        return _parse_results_html(response.text, self.school_id, term_ref, subject_code)
