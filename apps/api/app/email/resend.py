from __future__ import annotations

import httpx

from app.email.base import EmailProvider


class ResendEmailProvider(EmailProvider):
    provider_name = "resend"

    def __init__(self, api_key: str, from_email: str) -> None:
        self.api_key = api_key
        self.from_email = from_email

    def send_email(self, to: str, subject: str, text: str, html: str) -> dict:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": self.from_email,
                "to": [to],
                "subject": subject,
                "text": text,
                "html": html,
            },
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        return {
            "ok": True,
            "provider": self.provider_name,
            "id": data.get("id"),
        }
