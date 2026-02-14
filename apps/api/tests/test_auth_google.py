from __future__ import annotations

from urllib.parse import parse_qs, urlparse

import pytest

from app import create_app
from app.db import Base, SessionLocal


@pytest.fixture()
def app(tmp_path, monkeypatch):
    db_path = tmp_path / "auth.db"
    app = create_app(
        {
            "database_url": f"sqlite+pysqlite:///{db_path}",
            "frontend_url": "http://localhost:5173",
            "google_client_id": "google-client-id",
            "google_client_secret": "secret",
            "google_redirect_uri": "http://localhost:5000/auth/google/callback",
            "session_secret": "test-session-secret-12345678901234567890",
            "cookie_secure": False,
            "session_same_site": "Lax",
        }
    )
    Base.metadata.create_all(bind=app.extensions["db_engine"])

    from app import routes_auth

    monkeypatch.setattr(routes_auth, "exchange_code_for_tokens", lambda config, code: {"id_token": "fake-id-token"})
    monkeypatch.setattr(
        routes_auth,
        "verify_google_id_token",
        lambda token, audience: {
            "iss": "https://accounts.google.com",
            "sub": "sub-123",
            "email": "student@example.com",
            "email_verified": True,
            "name": "Student One",
            "aud": audience,
        },
    )

    yield app

    SessionLocal.remove()


@pytest.fixture()
def client(app):
    return app.test_client()


def test_google_auth_flow_sets_session_and_me(client):
    start = client.get("/auth/google/start")
    assert start.status_code == 302
    start_loc = start.headers["Location"]

    state = parse_qs(urlparse(start_loc).query)["state"][0]

    callback = client.get(f"/auth/google/callback?code=abc123&state={state}")
    assert callback.status_code == 302
    assert callback.headers["Location"] == "http://localhost:5173/dashboard"

    me = client.get("/me")
    assert me.status_code == 200
    payload = me.get_json()
    assert payload["email"] == "student@example.com"
    assert payload["name"] == "Student One"


def test_google_callback_rejects_invalid_state(client):
    client.get("/auth/google/start")
    bad = client.get("/auth/google/callback?code=abc123&state=wrong-state")
    assert bad.status_code == 400
    assert "Invalid OAuth state" in bad.get_data(as_text=True)
