from __future__ import annotations

from dataclasses import dataclass


class ValidationError(ValueError):
    pass


ALLOWED_PROVIDERS = {"foothill", "socccd", "deanza", "smc", "sdccd", "vsb4cd"}


@dataclass(slots=True)
class WatchCreateInput:
    provider: str
    term_ref: str
    cadence_seconds: int
    notify_on_waitlist: bool
    pasted_url: str | None
    crn: str | None
    class_number: str | None
    campus_code: str | None


@dataclass(slots=True)
class WatchPatchInput:
    is_active: bool | None = None
    notify_on_waitlist: bool | None = None
    cadence_seconds: int | None = None


def _string_or_none(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def parse_watch_create_payload(payload: dict) -> WatchCreateInput:
    provider = _string_or_none(payload.get("provider"))
    if not provider:
        raise ValidationError("provider is required")
    provider = provider.lower()
    if provider not in ALLOWED_PROVIDERS:
        raise ValidationError(f"provider must be one of: {', '.join(sorted(ALLOWED_PROVIDERS))}")

    cadence_seconds = int(payload.get("cadence_seconds") or 120)
    if cadence_seconds < 120:
        raise ValidationError("cadence_seconds must be >= 120")

    notify_on_waitlist = bool(payload.get("notify_on_waitlist", False))

    return WatchCreateInput(
        provider=provider,
        term_ref=_string_or_none(payload.get("term_ref")) or "current",
        cadence_seconds=cadence_seconds,
        notify_on_waitlist=notify_on_waitlist,
        pasted_url=_string_or_none(payload.get("pasted_url")),
        crn=_string_or_none(payload.get("crn")),
        class_number=_string_or_none(payload.get("class_number")),
        campus_code=_string_or_none(payload.get("campus_code")),
    )


def parse_watch_patch_payload(payload: dict) -> WatchPatchInput:
    if not payload:
        raise ValidationError("payload is required")

    patch = WatchPatchInput()

    if "is_active" in payload:
        patch.is_active = bool(payload["is_active"])
    if "notify_on_waitlist" in payload:
        patch.notify_on_waitlist = bool(payload["notify_on_waitlist"])
    if "cadence_seconds" in payload:
        cadence_seconds = int(payload["cadence_seconds"])
        if cadence_seconds < 120:
            raise ValidationError("cadence_seconds must be >= 120")
        patch.cadence_seconds = cadence_seconds

    if patch.is_active is None and patch.notify_on_waitlist is None and patch.cadence_seconds is None:
        raise ValidationError("No mutable fields provided")

    return patch
