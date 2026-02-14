from __future__ import annotations

from flask import Flask, g
from flask_cors import CORS

from app.auth import set_session_cookie
from app.config import AppConfig
from app.db import SessionLocal, init_engine
from app.email.base import ConsoleEmailProvider
from app.email.resend import ResendEmailProvider
from app.email.ses import SesEmailProvider
from app.models import Base
from app.routes_auth import bp as auth_bp
from app.routes_cron import bp as cron_bp
from app.routes_me import bp as me_bp
from app.routes_report import bp as report_bp
from app.routes_watches import bp as watches_bp
from enrolleagle_providers import get_provider_registry


def _build_email_sender(config: AppConfig):
    if config.email_provider == "resend" and config.resend_api_key:
        try:
            return ResendEmailProvider(config.resend_api_key, config.resend_from_email)
        except Exception:
            return ConsoleEmailProvider()
    if config.email_provider == "ses":
        try:
            return SesEmailProvider(config.ses_from_email)
        except Exception:
            return ConsoleEmailProvider()
    return ConsoleEmailProvider()


def create_app(test_config: dict | None = None) -> Flask:
    config = AppConfig.from_env()
    if test_config:
        for key, value in test_config.items():
            setattr(config, key, value)

    app = Flask(__name__)
    app.config["APP_CONFIG"] = config

    CORS(app, supports_credentials=True, origins=[config.frontend_url])

    engine = init_engine(config.database_url)
    app.extensions["db_engine"] = engine
    app.extensions["provider_registry"] = get_provider_registry()
    app.extensions["email_sender"] = _build_email_sender(config)

    @app.before_request
    def _open_session():
        g.db = SessionLocal()

    @app.after_request
    def _refresh_session_cookie(response):
        if getattr(g, "refresh_session_cookie", False) and getattr(g, "current_user", None) is not None:
            set_session_cookie(response, config, g.current_user)
        return response

    @app.teardown_request
    def _close_session(exc):
        db = getattr(g, "db", None)
        if db is None:
            return
        if exc is not None:
            db.rollback()
        db.close()

    @app.get("/health")
    def health_check():
        return {"ok": True}

    app.register_blueprint(auth_bp)
    app.register_blueprint(me_bp)
    app.register_blueprint(watches_bp)
    app.register_blueprint(cron_bp)
    app.register_blueprint(report_bp)

    return app


def init_db_schema() -> None:
    app = create_app()
    engine = app.extensions["db_engine"]
    Base.metadata.create_all(bind=engine)
