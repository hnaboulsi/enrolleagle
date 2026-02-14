from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app import create_app
from app.db import Base, SessionLocal
from app.models import NotificationLog, User, Watch


class StubProvider:
    def __init__(self, open_seats: int = 1, waitlist_open_seats: int = 0, status: str = "OPEN") -> None:
        self.open_seats = open_seats
        self.waitlist_open_seats = waitlist_open_seats
        self.status = status

    def get_seat_status(self, payload: dict):
        return type(
            "Status",
            (),
            {
                "open_seats": self.open_seats,
                "waitlist_open_seats": self.waitlist_open_seats,
                "status": self.status,
                "source_url": payload.get("source_url"),
                "raw_excerpt": "Open Seats: 1",
                "block_reason": None,
            },
        )()


class StubEmail:
    def __init__(self) -> None:
        self.sent = []

    def send_email(self, to: str, subject: str, text: str, html: str):
        self.sent.append({"to": to, "subject": subject})
        return {"ok": True, "provider": "stub"}


@pytest.fixture()
def app(tmp_path):
    db_path = tmp_path / "tick.db"
    app = create_app(
        {
            "database_url": f"sqlite+pysqlite:///{db_path}",
            "cron_secret": "cron-secret",
            "session_secret": "test-session-secret-12345678901234567890",
            "cookie_secure": False,
            "session_same_site": "Lax",
            "email_provider": "console",
        }
    )
    Base.metadata.create_all(bind=app.extensions["db_engine"])

    app.extensions["provider_registry"] = {"foothill": StubProvider(open_seats=3, waitlist_open_seats=0, status="OPEN")}
    app.extensions["email_sender"] = StubEmail()

    with app.app_context():
        session = SessionLocal()
        user = User(email="learner@example.com", google_sub="sub-1", name="Learner")
        session.add(user)
        session.flush()
        watch = Watch(
            user_id=user.id,
            provider="foothill",
            section_ref="12345",
            term_ref="2026SP",
            fetch_key="foothill:2026SP:12345",
            source_url="https://example.edu/schedule.html",
            notify_on_waitlist=False,
            last_open_seats=0,
            last_waitlist_open_seats=0,
            last_status="FULL",
            last_checked_at=None,
            next_run_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            cadence_seconds=120,
            is_active=True,
            report_hmac_salt="salt",
        )
        session.add(watch)
        session.commit()
        session.close()

    yield app

    SessionLocal.remove()


@pytest.fixture()
def client(app):
    return app.test_client()


def test_cron_tick_processes_due_watch_and_sends_notification(app, client):
    response = client.get("/cron/tick?token=cron-secret")
    assert response.status_code == 200
    data = response.get_json()
    assert data["processed_watches"] == 1
    assert data["sent_notifications"] == 1

    session = SessionLocal()
    count = session.query(NotificationLog).count()
    assert count == 1
    log = session.query(NotificationLog).first()
    assert log.trigger_type == "SEAT_OPEN"
    session.close()

    email_sender = app.extensions["email_sender"]
    assert len(email_sender.sent) == 1
