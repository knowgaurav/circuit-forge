"""Sliding-window agent context (Story B — B.2).

Holds the system prompt and a list of conversational turns. A *turn* is one
user message plus every assistant + tool-result message produced before the
next user message. ``messages_for_llm`` flattens turns to the OpenAI chat
shape that all our provider strategies accept.

Two limits keep the context bounded:

* ``max_turns`` (K=8) hard-caps the number of retained turns. Adding a 9th
  turn evicts the oldest.
* The ``max_tokens`` argument to ``messages_for_llm`` is enforced at read
  time. We estimate tokens as ``len(text) // 4`` (no tiktoken dep) and drop
  the oldest *whole* turn — user message plus its assistant + tool-result
  messages — until the total fits or we run out of turns to evict. The
  system prompt is never dropped. Eviction is bounded by ``len(turns)`` so a
  single oversized turn cannot cause an infinite loop.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


def _estimate_tokens(text: str) -> int:
    """Char-based token approximation. Matches the orchestrator estimator."""
    return len(text) // 4


@dataclass
class _ToolResultMsg:
    tool_call_id: str
    name: str
    result: dict[str, Any]
    is_error: bool


@dataclass
class _AssistantStep:
    text: str
    tool_calls: list[dict[str, Any]]
    tool_results: list[_ToolResultMsg] = field(default_factory=list)


@dataclass
class Turn:
    """One user message and the assistant + tool-result messages that follow."""

    user: str
    steps: list[_AssistantStep] = field(default_factory=list)


class AgentContext:
    """System prompt + sliding window of turns."""

    DEFAULT_MAX_TURNS = 8

    def __init__(self, system_prompt: str, max_turns: int = DEFAULT_MAX_TURNS) -> None:
        self.system_prompt = system_prompt
        self.max_turns = max_turns
        self.turns: list[Turn] = []

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def add_user(self, text: str) -> None:
        """Open a new turn with the user message. Evicts oldest beyond K."""
        self.turns.append(Turn(user=text))
        while len(self.turns) > self.max_turns:
            self.turns.pop(0)

    def add_assistant(self, text: str, tool_calls: list[dict[str, Any]]) -> None:
        """Append an assistant message to the most recent turn."""
        if not self.turns:
            raise RuntimeError("add_assistant called before add_user")
        self.turns[-1].steps.append(
            _AssistantStep(text=text, tool_calls=list(tool_calls))
        )

    def add_tool_result(
        self,
        tool_call_id: str,
        name: str,
        result: dict[str, Any],
        is_error: bool,
    ) -> None:
        """Attach a tool result to the most recent assistant step."""
        if not self.turns or not self.turns[-1].steps:
            raise RuntimeError("add_tool_result called before add_assistant")
        self.turns[-1].steps[-1].tool_results.append(
            _ToolResultMsg(
                tool_call_id=tool_call_id,
                name=name,
                result=result,
                is_error=is_error,
            )
        )

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def messages_for_llm(self, max_tokens: int) -> list[dict[str, Any]]:
        """Flatten to OpenAI chat messages, dropping oldest turns to fit budget.

        The system prompt is always retained. We evict the oldest turn
        (whole — user + every assistant step + every tool result) until the
        remainder fits ``max_tokens``. Eviction is bounded by the current
        ``len(turns)`` to guarantee termination if a single turn is larger
        than ``max_tokens``. Eviction operates on a *copy* of ``self.turns``
        so the underlying context is not mutated by the read.
        """
        turns = list(self.turns)
        for _ in range(len(turns) + 1):
            messages = self._build_messages_for(turns)
            if self._estimate_messages_tokens(messages) <= max_tokens:
                return messages
            if not turns:
                return messages
            turns.pop(0)
        return self._build_messages_for(turns)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _build_messages_for(self, turns: list[Turn]) -> list[dict[str, Any]]:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": self.system_prompt}
        ]
        for turn in turns:
            messages.append({"role": "user", "content": turn.user})
            for step in turn.steps:
                assistant_msg: dict[str, Any] = {
                    "role": "assistant",
                    "content": step.text,
                }
                if step.tool_calls:
                    assistant_msg["tool_calls"] = step.tool_calls
                messages.append(assistant_msg)
                for result in step.tool_results:
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": result.tool_call_id,
                            "name": result.name,
                            "content": json.dumps(result.result),
                        }
                    )
        return messages

    @staticmethod
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
