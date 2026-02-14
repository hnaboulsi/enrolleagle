from __future__ import annotations

import hashlib
from urllib.parse import urlparse

SUPPORTED_PROVIDER_KEYS = {"foothill", "socccd", "deanza", "smc", "sdccd", "vsb4cd"}
SOCCCD_CAMPUSES = {"ivc", "saddleback"}


def _require_identifier(payload: dict) -> str:
    identifier = payload.get("crn") or payload.get("class_number")
    if not identifier:
        raise ValueError("A CRN or class number is required.")
    return str(identifier).strip()


def _url_key(url: str) -> str:
    parsed = urlparse(url)
    stable = f"{parsed.netloc}{parsed.path}?{parsed.query}".strip("?")
    digest = hashlib.sha256(stable.encode("utf-8")).hexdigest()
    return digest[:16]


def build_watch_from_user_input(payload: dict) -> dict:
    provider = str(payload.get("provider", "")).strip().lower()
    if provider not in SUPPORTED_PROVIDER_KEYS:
        raise ValueError(f"Unsupported provider: {provider}")

    term_ref = str(payload.get("term_ref") or "current").strip()
    pasted_url = payload.get("pasted_url")
    source_url = str(pasted_url).strip() if pasted_url else None

    if provider == "socccd":
        section_ref = _require_identifier(payload)
        campus_code = str(payload.get("campus_code") or "ivc").strip().lower()
        if campus_code not in SOCCCD_CAMPUSES:
            raise ValueError("campus_code must be one of: ivc, saddleback")
        if not source_url:
            source_url = (
                "https://mysite.socccd.edu/eservices/ClassSearchForm.aspx"
                f"?campus={campus_code}&term={term_ref}&class={section_ref}"
            )
        fetch_key = f"{provider}:{campus_code}:{term_ref}:{section_ref}"
        return {
            "section_ref": section_ref,
            "term_ref": term_ref,
            "fetch_key": fetch_key,
            "source_url": source_url,
        }

    if provider in {"foothill", "deanza"}:
        section_ref = _require_identifier(payload)
        if source_url:
            fetch_key = f"{provider}:{_url_key(source_url)}"
        else:
            fetch_key = f"{provider}:{term_ref}:{section_ref}"
        return {
            "section_ref": section_ref,
            "term_ref": term_ref,
            "fetch_key": fetch_key,
            "source_url": source_url,
        }

    section_ref = str(payload.get("class_number") or payload.get("crn") or "unsupported").strip()
    if not section_ref and not source_url:
        raise ValueError("Provide at least one identifier for unsupported provider scaffolds.")
    fetch_key = f"{provider}:{_url_key(source_url) if source_url else section_ref}"
    return {
        "section_ref": section_ref or "unsupported",
        "term_ref": term_ref,
        "fetch_key": fetch_key,
        "source_url": source_url,
    }
