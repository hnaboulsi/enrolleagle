"""Catalog-search caching layer backed by the catalog_cache Postgres table.

get_or_fetch_catalog() checks the cache first, and on a miss calls the
search provider and stores the result.
"""
from __future__ import annotations

import dataclasses
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CatalogCache

DEFAULT_TTL_MINUTES = 30


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _result_to_dict(result) -> dict:
    """Convert a CatalogSearchResult dataclass tree to a JSON-serialisable dict."""
    if dataclasses.is_dataclass(result) and not isinstance(result, type):
        return {
            k: _result_to_dict(v) for k, v in dataclasses.asdict(result).items()
        }
    if isinstance(result, list):
        return [_result_to_dict(item) for item in result]
    return result


def get_or_fetch_catalog(
    db: Session,
    school_id: str,
    term_ref: str,
    subject_code: str,
    search_provider,
    ttl_minutes: int = DEFAULT_TTL_MINUTES,
) -> dict:
    """Return cached catalog data or fetch from provider and cache it.

    Returns the payload as a plain dict (JSON-serialisable).
    """
    now = _now_utc()

    # Check cache
    cached = db.execute(
        select(CatalogCache).where(
            CatalogCache.school_id == school_id,
            CatalogCache.term_ref == term_ref,
            CatalogCache.subject_code == subject_code,
            CatalogCache.expires_at > now,
        )
    ).scalars().first()

    if cached is not None:
        # If the provider is blocked (e.g., SOC CCD redirect to JS-only),
        # avoid serving stale empty results.
        if (
            cached.payload_json.get("items") == []
            and getattr(search_provider, "school_id", None) == "socccd"
        ):
            db.delete(cached)
            db.commit()
        else:
            return cached.payload_json

    # Cache miss — fetch from provider
    result = search_provider.search_catalog(term_ref, subject_code)
    payload = _result_to_dict(result)

    # Upsert into cache
    existing = db.execute(
        select(CatalogCache).where(
            CatalogCache.school_id == school_id,
            CatalogCache.term_ref == term_ref,
            CatalogCache.subject_code == subject_code,
        )
    ).scalars().first()

    expires_at = now + timedelta(minutes=ttl_minutes)

    if existing is not None:
        existing.payload_json = payload
        existing.fetched_at = now
        existing.expires_at = expires_at
    else:
        entry = CatalogCache(
            school_id=school_id,
            term_ref=term_ref,
            subject_code=subject_code,
            payload_json=payload,
            fetched_at=now,
            expires_at=expires_at,
        )
        db.add(entry)

    db.commit()
    return payload
