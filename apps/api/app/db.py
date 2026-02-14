from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, scoped_session, sessionmaker


class Base(DeclarativeBase):
    pass


engine = None
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False))


def init_engine(database_url: str):
    global engine
    engine = create_engine(database_url, pool_pre_ping=True, future=True)
    SessionLocal.configure(bind=engine)
    return engine


@contextmanager
def session_scope() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
