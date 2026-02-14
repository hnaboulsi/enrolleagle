from __future__ import annotations

import boto3

from app.email.base import EmailProvider


class SesEmailProvider(EmailProvider):
    provider_name = "ses"

    def __init__(self, from_email: str) -> None:
        self.from_email = from_email
        self.client = boto3.client("sesv2")

    def send_email(self, to: str, subject: str, text: str, html: str) -> dict:
        response = self.client.send_email(
            FromEmailAddress=self.from_email,
            Destination={"ToAddresses": [to]},
            Content={
                "Simple": {
                    "Subject": {"Data": subject},
                    "Body": {
                        "Text": {"Data": text},
                        "Html": {"Data": html},
                    },
                }
            },
        )
        return {
            "ok": True,
            "provider": self.provider_name,
            "message_id": response.get("MessageId"),
        }
