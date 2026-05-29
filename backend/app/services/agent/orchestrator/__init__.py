"""ReAct orchestrator package.

Sub-modules:

* :mod:`.result` — :class:`TurnResult` Pydantic model and the
  :data:`ABORTED_MESSAGE` sentinel; the JSON shape returned by
  ``POST /api/agent/turn``.
* :mod:`.tokens` — character-based token estimators and the default budget
  caps (``DEFAULT_MAX_*``) sourced from ``contracts.md``.
* :mod:`.dispatch` — argument validation, tool invocation, and structured
  error shaping; owns the lazy ``ToolError`` fallback.
* :mod:`.loop` — :class:`Orchestrator` with ``run_turn`` and the structural
  protocols (:class:`AgentTraceRepoLike`).

Re-exports preserve the pre-split import surface so callers keep using
``from app.services.agent.orchestrator import Orchestrator, TurnResult,
ABORTED_MESSAGE`` unchanged.
"""

from .dispatch import ToolError, ToolFn
from .loop import AgentTraceRepoLike, Orchestrator
from .result import ABORTED_MESSAGE, TurnResult
from .tokens import (
    DEFAULT_MAX_INPUT_TOKENS,
    DEFAULT_MAX_ITERATIONS,
    DEFAULT_MAX_OUTPUT_TOKENS,
)

__all__ = [
    "ABORTED_MESSAGE",
    "AgentTraceRepoLike",
    "DEFAULT_MAX_INPUT_TOKENS",
    "DEFAULT_MAX_ITERATIONS",
    "DEFAULT_MAX_OUTPUT_TOKENS",
    "Orchestrator",
    "ToolError",
    "ToolFn",
    "TurnResult",
]
