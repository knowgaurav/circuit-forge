"""LLM tools package.

Replaces the former single-file ``llm_tools.py``. Public surface unchanged:
callers still write ``from app.services.llm_tools import TOOL_DEFINITIONS,
get_tool_handler``.

Sub-modules
-----------
* :mod:`.definitions`         — the OpenAI-compatible tool schemas.
* :mod:`.blueprint_validator` — the ``validate_blueprint`` checks.
* :mod:`.handler`             — ``ToolHandler`` + the ``get_tool_handler``
  singleton that routes tool calls and encodes results.
"""

from .definitions import TOOL_DEFINITIONS
from .handler import ToolHandler, get_tool_handler

__all__ = ["TOOL_DEFINITIONS", "ToolHandler", "get_tool_handler"]
