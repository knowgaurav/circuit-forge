"""Turn result model — the shape ``POST /api/agent/turn`` returns.

The orchestrator's public output is a single :class:`TurnResult`. The Pydantic
field aliases convert the internal ``snake_case`` names to the ``camelCase``
shape that the frontend consumes:

.. code-block:: json

    {
        "trace": [
            {"kind": "thought", "text": "I'll add an AND gate."},
            {"kind": "tool_call", "tool": "add_component", "args": {...}},
            {"kind": "tool_result", "tool": "add_component", "result": {...},
             "is_error": false}
        ],
        "finalMessage": "Added an AND gate at (120, 80).",
        "tokensIn": 312,
        "tokensOut": 87,
        "iterations": 2,
        "aborted": false,
        "abortReason": null
    }

When the loop hits a hard cap, ``aborted`` is ``true``, ``finalMessage`` is the
sentinel :data:`ABORTED_MESSAGE` (``"<aborted>"``), and ``abortReason`` is one
of ``"max_iterations" | "max_input_tokens" | "max_output_tokens"``.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


ABORTED_MESSAGE = "<aborted>"


class TurnResult(BaseModel):
    """Orchestrator turn result — matches ``POST /api/agent/turn`` shape."""

    trace: list[dict[str, Any]]
    final_message: str = Field(alias="finalMessage")
    tokens_in: int = Field(alias="tokensIn")
    tokens_out: int = Field(alias="tokensOut")
    iterations: int
    aborted: bool
    abort_reason: str | None = Field(alias="abortReason")

    model_config = {"populate_by_name": True}
