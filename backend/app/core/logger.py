"""Singleton logger with Axiom integration and request context support."""

import logging
import sys
from contextvars import ContextVar
from typing import Any

from pythonjsonlogger import jsonlogger

from app.core.config import settings

_logger: logging.Logger | None = None
request_context: ContextVar[dict[str, Any]] = ContextVar("request_context", default={})


class ContextAwareJsonFormatter(jsonlogger.JsonFormatter):
    """JSON formatter that includes request context in every log."""

    def add_fields(
        self,
        log_record: dict[str, Any],
        record: logging.LogRecord,
        message_dict: dict[str, Any],
    ) -> None:
        super().add_fields(log_record, record, message_dict)
        ctx = request_context.get()
        for key, value in ctx.items():
            if key not in log_record:
                log_record[key] = value


def get_logger() -> logging.Logger:
    """Get the singleton application logger."""
    global _logger
    if _logger is None:
        _logger = _create_logger()
    return _logger


def _create_logger() -> logging.Logger:
    """Create and configure the application logger."""
    logger = logging.getLogger("circuitforge")
    logger.setLevel(getattr(logging, settings.log_level.upper()))
    logger.handlers.clear()
    logger.propagate = False

    handler = logging.StreamHandler(sys.stdout)
    formatter = ContextAwareJsonFormatter(
        "%(asctime)s %(levelname)s %(message)s",
        rename_fields={"levelname": "level", "asctime": "timestamp"},
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    if settings.axiom_token:
        try:
            from axiom_py import Client
            from axiom_py.logging import AxiomHandler

            axiom_client = Client(settings.axiom_token, settings.axiom_org_id)
            axiom_handler = AxiomHandler(
                client=axiom_client,
                dataset=settings.axiom_dataset,
            )
            logger.addHandler(axiom_handler)
            logger.info(
                "Axiom logging enabled",
                extra={"axiom_dataset": settings.axiom_dataset},
            )
        except ImportError:
            logger.warning("axiom-py not installed, Axiom logging disabled")
        except Exception as e:
            logger.warning(f"Failed to initialize Axiom handler: {e}")

    return logger


def enrich_context(**kwargs: Any) -> None:
    """Add fields to the current request context."""
    ctx = request_context.get().copy()
    ctx.update(kwargs)
    request_context.set(ctx)


def get_context() -> dict[str, Any]:
    """Get a copy of the current request context."""
    return request_context.get().copy()


def clear_context() -> None:
    """Clear the current request context."""
    request_context.set({})


def log_event(message: str, level: str = "info", **extra: Any) -> None:
    """Emit a log event with the current request context and extra fields."""
    logger = get_logger()
    ctx = request_context.get()
    log_fn = getattr(logger, level)
    log_fn(message, extra={**ctx, **extra})
