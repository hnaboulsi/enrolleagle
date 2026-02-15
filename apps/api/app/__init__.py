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
    # #region agent log
    import json as _json, time as _time
    def _dbglog(loc, msg, data=None):
        try:
            with open("/app/.cursor/debug.log", "a") as _f:
                _f.write(_json.dumps({"location": loc, "message": msg, "data": data or {}, "timestamp": int(_time.time()*1000), "hypothesisId": "B"}) + "\n")
        except Exception:
            pass
    # #endregion
    if config.email_provider == "resend" and config.resend_api_key:
        try:
            sender = ResendEmailProvider(config.resend_api_key, config.resend_from_email)
            # #region agent log
            _dbglog("app/__init__.py:_build_email_sender", "Email provider created", {"provider": "resend"})
            # #endregion
            return sender
        except Exception:
            return ConsoleEmailProvider()
    if config.email_provider == "ses":
        try:
            sender = SesEmailProvider(config.ses_from_email)
            # #region agent log
            _dbglog("app/__init__.py:_build_email_sender", "Email provider created (SES did NOT throw)", {"provider": "ses", "from_email": config.ses_from_email, "note": "boto3.client does not fail without creds at init time"})
            # #endregion
            return sender
        except Exception as exc:
            # #region agent log
            _dbglog("app/__init__.py:_build_email_sender", "SES init failed, falling back to console", {"error": str(exc)})
            # #endregion
            return ConsoleEmailProvider()
    # #region agent log
    _dbglog("app/__init__.py:_build_email_sender", "Fallback to ConsoleEmailProvider", {"configured_provider": config.email_provider})
    # #endregion
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
        # #region agent log
        import json as _json, time as _time
        try:
            with open("/app/.cursor/debug.log", "a") as _f:
                _f.write(_json.dumps({"location": "app/__init__.py:_open_session", "message": "Opening DB session", "data": {"path": str(request.path)}, "timestamp": int(_time.time()*1000), "hypothesisId": "E"}) + "\n")
        except Exception:
            pass
        # #endregion
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
        # #region agent log
        if exc is not None:
            import json as _json, time as _time
            try:
                with open("/app/.cursor/debug.log", "a") as _f:
                    _f.write(_json.dumps({"location": "app/__init__.py:_close_session", "message": "Request teardown with exception", "data": {"exc": str(exc), "path": str(request.path)}, "timestamp": int(_time.time()*1000), "hypothesisId": "E"}) + "\n")
            except Exception:
                pass
        # #endregion
        if exc is not None:
            db.rollback()
        db.close()

    @app.get("/health")
    def health_check():
        # #region agent log
        import json as _json, time as _time
        diag = {"db_ok": False, "tables_exist": False}
        try:
            from sqlalchemy import text
            result = g.db.execute(text("SELECT 1")).scalar()
            diag["db_ok"] = result == 1
            table_check = g.db.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')")).scalar()
            diag["tables_exist"] = bool(table_check)
        except Exception as exc:
            diag["db_error"] = str(exc)
        try:
            with open("/app/.cursor/debug.log", "a") as _f:
                _f.write(_json.dumps({"location": "app/__init__.py:health_check", "message": "Health check diagnostics", "data": diag, "timestamp": int(_time.time()*1000), "hypothesisId": "E"}) + "\n")
        except Exception:
            pass
        # #endregion
        return {"ok": True}

    app.register_blueprint(auth_bp)
    app.register_blueprint(me_bp)
    app.register_blueprint(watches_bp)
    app.register_blueprint(cron_bp)
    app.register_blueprint(report_bp)

    # #region agent log
    import json as _json, time as _time, os as _os
    try:
        _os.makedirs("/app/.cursor", exist_ok=True)
        with open("/app/.cursor/debug.log", "a") as _f:
            _f.write(_json.dumps({
                "location": "app/__init__.py:create_app",
                "message": "App created successfully",
                "data": {
                    "email_provider_type": type(app.extensions["email_sender"]).__name__,
                    "frontend_url": config.frontend_url,
                    "database_url_prefix": config.database_url[:40] + "...",
                    "cookie_secure": config.cookie_secure,
                    "session_same_site": config.session_same_site,
                    "environment": config.environment,
                },
                "timestamp": int(_time.time()*1000),
                "hypothesisId": "STARTUP"
            }) + "\n")
    except Exception:
        pass
    # #endregion

    return app


def init_db_schema() -> None:
    app = create_app()
    engine = app.extensions["db_engine"]
    Base.metadata.create_all(bind=engine)
