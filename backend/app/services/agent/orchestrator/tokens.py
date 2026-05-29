"""Token estimation and default budget caps.

The orchestrator does not call a real tokenizer. It uses a
``len(text) // 4`` heuristic — roughly four characters per token for English
text — which is precise enough to enforce the per-turn budget without pulling
in ``tiktoken`` or making an extra network round-trip. Over-estimating by a
few percent is safe; the hard caps below leave plenty of headroom.

Cap values are sourced from
``.kiro/specs/system-design-improvement/contracts.md`` — see the ReAct
budget section for the canonical numbers and the rationale behind them.
"""

from __future__ import annotations

import json
from typing import Any

from app.services.llm_providers import LLMResponse


DEFAULT_MAX_ITERATIONS = 6
DEFAULT_MAX_INPUT_TOKENS = 4000
DEFAULT_MAX_OUTPUT_TOKENS = 1000


def _estimate_tokens(text: str) -> int:
    return len(text) // 4


def _estimate_messages_tokens(messages: list[dict[str, Any]]) -> int:
    total = 0
    for msg in messages:
        content = msg.get("content")
        if isinstance(content, str):
            total += _estimate_tokens(content)
        for tc in msg.get("tool_calls", []) or []:
            func = tc.get("function", {})
            args = func.get("arguments", "")
            if not isinstance(args, str):
                args = json.dumps(args)
            total += _estimate_tokens(args)
            total += _estimate_tokens(func.get("name", ""))
    return total


def _estimate_response_tokens(response: LLMResponse) -> int:
    total = _estimate_tokens(response.raw_content or "")
    for tc in response.tool_calls:
        func = tc.get("function", {})
        args = func.get("arguments", "")
        if not isinstance(args, str):
            args = json.dumps(args)
        total += _estimate_tokens(args)
        total += _estimate_tokens(func.get("name", ""))
    return total
