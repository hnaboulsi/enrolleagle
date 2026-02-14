from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class EmailSendResult:
    ok: bool
    provider: str
    response: dict


class EmailProvider:
    provider_name = "base"

    def send_email(self, to: str, subject: str, text: str, html: str) -> dict:
        raise NotImplementedError


class ConsoleEmailProvider(EmailProvider):
    provider_name = "console"

    def send_email(self, to: str, subject: str, text: str, html: str) -> dict:
        print("[ConsoleEmail]", {"to": to, "subject": subject, "text": text})
        return {"ok": True, "provider": self.provider_name}
