from __future__ import annotations

import os
from dataclasses import dataclass


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return int(value)


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(slots=True)
class AppConfig:
    environment: str
    database_url: str
    frontend_url: str
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str
    session_secret: str
    session_ttl_seconds: int
    session_cookie_name: str
    oauth_state_cookie_name: str
    session_same_site: str
    cookie_secure: bool
    cron_secret: str
    cron_batch_size: int
    max_active_watches: int
    default_cadence_seconds: int
    email_provider: str
    ses_from_email: str
    resend_api_key: str
    resend_from_email: str
    report_hmac_secret: str

    @classmethod
    def from_env(cls) -> "AppConfig":
        environment = os.getenv("FLASK_ENV", os.getenv("ENV", "development"))
        session_same_site = os.getenv("SESSION_SAME_SITE", "Lax")
        return cls(
            environment=environment,
            database_url=os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/enrolleagle"),
            frontend_url=os.getenv("FRONTEND_URL", "http://localhost:5173"),
            google_client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
            google_client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
            google_redirect_uri=os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5000/auth/google/callback"),
            session_secret=os.getenv("SESSION_SECRET", "dev-session-secret-change-me-please-32-bytes"),
            session_ttl_seconds=_int_env("SESSION_TTL_SECONDS", 8 * 60 * 60),
            session_cookie_name=os.getenv("SESSION_COOKIE_NAME", "enrolleagle_session"),
            oauth_state_cookie_name=os.getenv("OAUTH_STATE_COOKIE_NAME", "enrolleagle_oauth_state"),
            session_same_site=session_same_site,
            cookie_secure=_bool_env("COOKIE_SECURE", environment == "production"),
            cron_secret=os.getenv("CRON_SECRET", "dev-cron-secret"),
            cron_batch_size=_int_env("CRON_BATCH_SIZE", 100),
            max_active_watches=_int_env("MAX_ACTIVE_WATCHES", 20),
            default_cadence_seconds=max(120, _int_env("DEFAULT_CADENCE_SECONDS", 120)),
            email_provider=os.getenv("EMAIL_PROVIDER", "ses").lower(),
            ses_from_email=os.getenv("SES_FROM_EMAIL", "alerts@example.com"),
            resend_api_key=os.getenv("RESEND_API_KEY", ""),
            resend_from_email=os.getenv("RESEND_FROM_EMAIL", "alerts@example.com"),
            report_hmac_secret=os.getenv("REPORT_HMAC_SECRET", "dev-report-secret"),
        )
