"""Wide Event Middleware for end-to-end request tracing."""

import time
import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.logger import clear_context, log_event, request_context


class WideEventMiddleware(BaseHTTPMiddleware):
    """Middleware that implements wide event logging with trace correlation."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract or generate trace identifiers from headers
        trace_id = request.headers.get("X-Trace-ID") or f"trace_{uuid.uuid4().hex[:16]}"
        request_id = (
            request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:8]}"
        )
        source = request.headers.get("X-Source", "direct")
        session_code = request.headers.get("X-Session-Code")

        start_time = time.perf_counter()

        # Initialize wide event context with request metadata
        initial_context = {
            "trace_id": trace_id,
            "request_id": request_id,
            "source": source,
            "method": request.method,
            "path": request.url.path,
            "service": "circuitforge-api",
            "version": "0.1.0",
            "environment": "development" if settings.debug else "production",
        }

        # Add optional context fields
        if session_code:
            initial_context["session_code"] = session_code
        if request.query_params:
            initial_context["query_params"] = dict(request.query_params)
        if request.client:
            initial_context["client_ip"] = request.client.host
        user_agent = request.headers.get("User-Agent")
        if user_agent:
            initial_context["user_agent"] = user_agent

        request_context.set(initial_context)

        status_code = 500
        error_info: dict = {}

        try:
            response = await call_next(request)
            status_code = response.status_code

            # Add trace headers to response for client correlation
            response.headers["X-Trace-ID"] = trace_id
            response.headers["X-Request-ID"] = request_id

            return response
        except Exception as e:
            error_info = {
                "error_type": type(e).__name__,
                "error_message": str(e),
            }
            raise
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            log_level = "error" if status_code >= 500 else "info"

            # Skip logging for health checks to reduce noise
            if request.url.path not in ("/health", "/api/health"):
                log_event(
                    "request_completed",
                    level=log_level,
                    status_code=status_code,
                    duration_ms=round(duration_ms, 2),
                    **error_info,
                )

            clear_context()
