"""Отправка писем. Пока письма только пишутся в лог: настоящий SMTP подключится
отдельной реализацией EmailSender."""

import logging
from typing import Protocol

logger = logging.getLogger("freetraining.mail")


class EmailSender(Protocol):
    async def send(self, to: str, subject: str, body: str) -> None: ...


class ConsoleEmailSender:
    async def send(self, to: str, subject: str, body: str) -> None:
        logger.info("Письмо для %s: %s\n%s", to, subject, body)


def get_email_sender() -> EmailSender:
    return ConsoleEmailSender()
