"""Foothill College (FHDA) catalog-search adapter.

Scrapes the public schedule at foothill.edu/schedule/ to provide
terms, subjects, and course/section listings.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
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

BASE_URL = "https://foothill.edu/schedule/"
JSON_URL = "https://foothill.edu/schedule/index-json.html"

# FHDA term codes:  <year><quarter>  W=Winter S=Spring U=Summer F=Fall
TERMS: list[TermInfo] = [
    TermInfo(term_ref="2026S", label="Spring 2026"),
    TermInfo(term_ref="2026W", label="Winter 2026"),
    TermInfo(term_ref="2025F", label="Fall 2025"),
    TermInfo(term_ref="2025U", label="Summer 2025"),
    TermInfo(term_ref="2025S", label="Spring 2025"),
]

# Map of dropdown label -> dept param value used in the URL
# Populated lazily from scraping the schedule page
_CACHED_SUBJECTS: dict[str, list[SubjectInfo]] | None = None

SEAT_RE = re.compile(r"(\d+)\s+of\s+\d+\s+seats?\s+open", re.I)
WAITLIST_RE = re.compile(r"(\d+)\s+of\s+\d+\s+waitlist\s+seats?\s+open", re.I)
CRN_RE = re.compile(r"(?:CRN|Course Ref\.? Number|Section#)\D*(\d{4,6})", re.I)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _scrape_subjects() -> list[SubjectInfo]:
    """Fetch the main schedule page and extract subjects from the dept dropdown."""
    response = fetch_url(BASE_URL, retries=2)
    tree = HTMLParser(response.text)
    subjects: list[SubjectInfo] = []

    dept_select = tree.css_first("select[name='dept']")
    if not dept_select:
        return subjects

    for option in dept_select.css("option"):
        text = (option.text(deep=True) or "").strip()
        value = (option.attributes.get("value") or "").strip()
        if not text or not value or value.lower() in {"every", "all"}:
            continue
        # Use the option value (e.g., "ACTG|Accounting") as the subject code
        subjects.append(SubjectInfo(subject_code=value, subject_name=text))

    return subjects


def _parse_schedule_html(html: str, school_id: str, term_ref: str, subject_code: str) -> CatalogSearchResult:
    """Parse the Foothill schedule HTML into normalized CourseResult objects."""
    tree = HTMLParser(html)
    text = tree.body.text(separator="\n") if tree.body else html

    courses: dict[str, CourseResult] = {}

    def _parse_day_time(value: str) -> tuple[str | None, str | None, str | None]:
        if not value or "TBA" in value.upper():
            return None, None, None
        match = re.match(r"([A-Za-z]+)\s+(\d{1,2}:\d{2}\s*[AP]M)\s*[-–]\s*(\d{1,2}:\d{2}\s*[AP]M)", value)
        if not match:
            return None, None, None
        return match.group(1), match.group(2), match.group(3)

    for section in tree.css("div.section"):
        parent = section
        while parent is not None and not parent.css_first("h3.fh_course-id"):
            parent = parent.parent
        if parent is None:
            continue

        course_code_node = parent.css_first("h3.fh_course-id")
        course_title_node = parent.css_first("h3.fh_course-head")
        units_node = parent.css_first("h3.fh_course-units")
        if course_code_node is None or course_title_node is None:
            continue

        course_code = course_code_node.text().strip()
        course_title = course_title_node.text().strip()
        units = None
        if units_node:
            units = units_node.text().replace("units", "").strip() or None

        course_key = f"{course_code}|{course_title}"
        if course_key not in courses:
            courses[course_key] = CourseResult(
                course_code=course_code,
                course_title=course_title,
                units=units,
                sections=[],
            )

        section_head = section.css_first("section.fh_section-head")
        head_text = section_head.text(separator=" ") if section_head else section.text(separator=" ")

        section_code_match = re.search(r"Section:\s*([A-Z0-9-]+)", head_text)
        section_code = section_code_match.group(1) if section_code_match else None

        crn_match = re.search(r"Course Number\s*\(CRN\):\s*(\d+)", head_text)
        crn = crn_match.group(1) if crn_match else None
        if not crn:
            continue

        status_text = head_text.lower()
        status = "UNKNOWN"
        if "waitlist" in status_text:
            status = "WAITLIST"
        elif "open" in status_text:
            status = "OPEN"
        elif "closed" in status_text:
            status = "CLOSED"
        elif "full" in status_text:
            status = "FULL"

        # Extract seat info
        section_text = section.text(separator=" ")
        seat_match = SEAT_RE.search(section_text)
        waitlist_match = WAITLIST_RE.search(section_text)
        open_seats = int(seat_match.group(1)) if seat_match else None
        waitlist_seats = int(waitlist_match.group(1)) if waitlist_match else None

        # Override status using seat counts
        if open_seats is not None and open_seats > 0:
            status = "OPEN"
        elif waitlist_seats is not None and waitlist_seats > 0:
            status = "WAITLIST"
        elif open_seats == 0:
            status = "FULL"

        # Meeting times and instructor
        meetings: list[MeetingTime] = []
        instructor = None
        for meet_tr in section.css("div.meet-tr"):
            cells = [cell.text().strip() for cell in meet_tr.css("div.meet-td")]
            if not cells:
                continue
            type_label = cells[0] if len(cells) > 0 else None
            room = cells[1] if len(cells) > 1 else None
            day_time = cells[2] if len(cells) > 2 else None
            instr = cells[3] if len(cells) > 3 else None
            if instr and instr.upper() not in {"TBA", "STAFF"}:
                instructor = instr
            days, start, end_time = _parse_day_time(day_time or "")
            if any([days, start, end_time, room, type_label]):
                meetings.append(MeetingTime(
                    days=days,
                    start=start,
                    end_time=end_time,
                    location=room or None,
                    modality=type_label or None,
                ))

        section_label = f"CRN {crn}"
        if section_code:
            section_label = f"CRN {crn} / {section_code}"

        courses[course_key].sections.append(SectionResult(
            section_id=f"CRN:{crn}",
            section_label=section_label,
            meeting_times=meetings,
            instructor=instructor,
            status=status,
            open_seats=open_seats,
            waitlist_open_seats=waitlist_seats,
            source_url=None,
            block_reason=None,
        ))

    # If HTML parsing yielded nothing, try a text-based fallback
    if not courses:
        courses_list = _parse_text_fallback(text, school_id, term_ref, subject_code)
    else:
        courses_list = list(courses.values())

    return CatalogSearchResult(
        school_id=school_id,
        term_ref=term_ref,
        subject_code=subject_code,
        items=courses_list,
    )


def _parse_text_fallback(text: str, school_id: str, term_ref: str, subject_code: str) -> list[CourseResult]:
    """Fallback: extract CRNs from raw text when HTML structure is unrecognised."""
    courses: list[CourseResult] = []
    current: CourseResult | None = None
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        # Look for course-like lines
        cm = re.match(r"([A-Z][A-Z &]{0,10}\d+[A-Z]?)\s*[-–]\s*(.+)", line)
        if cm:
            current = CourseResult(course_code=cm.group(1).strip(), course_title=cm.group(2).strip())
            courses.append(current)
            continue
        crn_m = CRN_RE.search(line)
        if crn_m:
            crn = crn_m.group(1)
            if current is None:
                current = CourseResult(course_code=subject_code, course_title="Unknown Course")
                courses.append(current)
            current.sections.append(SectionResult(
                section_id=f"CRN:{crn}",
                section_label=f"CRN {crn}",
                status="UNKNOWN",
            ))
    return courses


# ---------------------------------------------------------------------------
# Public adapter
# ---------------------------------------------------------------------------

class FoothillSearchAdapter:
    school_id = "foothill"

    def get_terms(self) -> list[TermInfo]:
        return list(TERMS)

    def get_subjects(self, term_ref: str) -> list[SubjectInfo]:
        global _CACHED_SUBJECTS
        if _CACHED_SUBJECTS is None:
            try:
                _CACHED_SUBJECTS = {"_all": _scrape_subjects()}
            except Exception:
                _CACHED_SUBJECTS = {"_all": []}
        return _CACHED_SUBJECTS.get("_all", [])

    def search_catalog(self, term_ref: str, subject_code: str) -> CatalogSearchResult:
        params = {
            "Quarter": term_ref,
            "dept": subject_code,
            "availability": "all",
        }
        url = f"{JSON_URL}?{urlencode(params)}"
        try:
            response = fetch_url(url, retries=2)
            return _parse_schedule_html(response.text, self.school_id, term_ref, subject_code)
        except Exception as exc:
            return CatalogSearchResult(
                school_id=self.school_id,
                term_ref=term_ref,
                subject_code=subject_code,
                items=[],
            )
