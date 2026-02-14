from __future__ import annotations

from itsdangerous import BadSignature, BadTimeSignature, URLSafeTimedSerializer


def _serializer(secret: str, salt: str) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(secret_key=secret, salt=salt)


def sign_payload(secret: str, salt: str, payload: dict) -> str:
    return _serializer(secret, salt).dumps(payload)


def load_payload(secret: str, salt: str, token: str, max_age_seconds: int) -> dict | None:
    try:
        data = _serializer(secret, salt).loads(token, max_age=max_age_seconds)
    except (BadSignature, BadTimeSignature):
        return None
    if not isinstance(data, dict):
        return None
    return data
