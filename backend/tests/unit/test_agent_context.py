"""Unit tests for AgentContext (Story B — B.2)."""

from __future__ import annotations

from app.services.agent.context import AgentContext


SYSTEM_PROMPT = "You are a circuit assistant."


class TestSlidingWindow:
    def test_adding_turns_past_limit_evicts_oldest(self) -> None:
        ctx = AgentContext(SYSTEM_PROMPT, max_turns=8)
        for i in range(10):
            ctx.add_user(f"turn-{i}")
        assert len(ctx.turns) == 8
        # The oldest two (turn-0, turn-1) were evicted.
        assert ctx.turns[0].user == "turn-2"
        assert ctx.turns[-1].user == "turn-9"

    def test_under_limit_keeps_all_turns(self) -> None:
        ctx = AgentContext(SYSTEM_PROMPT, max_turns=8)
        for i in range(5):
            ctx.add_user(f"u-{i}")
        assert [t.user for t in ctx.turns] == [f"u-{i}" for i in range(5)]


class TestMessagesForLLM:
    def test_system_prompt_always_included(self) -> None:
        ctx = AgentContext(SYSTEM_PROMPT)
        ctx.add_user("hi")
        msgs = ctx.messages_for_llm(max_tokens=1000)
        assert msgs[0] == {"role": "system", "content": SYSTEM_PROMPT}

    def test_assistant_and_tool_messages_flattened_in_order(self) -> None:
        ctx = AgentContext(SYSTEM_PROMPT)
        ctx.add_user("add an AND gate")
        ctx.add_assistant(
            "I'll add it.",
            tool_calls=[
                {
                    "id": "call-1",
                    "type": "function",
                    "function": {"name": "add_component", "arguments": "{}"},
                }
            ],
        )
        ctx.add_tool_result(
            tool_call_id="call-1",
            name="add_component",
            result={"component_id": "c1", "seq": 1},
            is_error=False,
        )
        ctx.add_assistant("Done.", tool_calls=[])

        msgs = ctx.messages_for_llm(max_tokens=10_000)
        roles = [m["role"] for m in msgs]
        assert roles == ["system", "user", "assistant", "tool", "assistant"]
        assert msgs[3]["tool_call_id"] == "call-1"
        assert msgs[3]["name"] == "add_component"

    def test_oversized_turn_forces_eviction_without_infinite_loop(self) -> None:
        ctx = AgentContext(SYSTEM_PROMPT)
        # Two turns; the first is *much* larger than the budget so it has to
        # be dropped to fit. We cap eviction at len(turns) iterations so
        # this must terminate.
        ctx.add_user("X" * 4000)  # ~1000 tokens
        ctx.add_user("hello")

        msgs = ctx.messages_for_llm(max_tokens=10)

        # Only the small turn survives in the returned messages.
        user_msgs = [m for m in msgs if m["role"] == "user"]
        assert len(user_msgs) <= 1
        if user_msgs:
            assert user_msgs[0]["content"] == "hello"

    def test_eviction_bounded_when_single_turn_too_large(self) -> None:
        """Single oversized turn should not loop forever; it gets dropped."""
        ctx = AgentContext(SYSTEM_PROMPT)
        ctx.add_user("Y" * 8000)

        msgs = ctx.messages_for_llm(max_tokens=5)

        # Returned slice contains only the system prompt.
        assert len(msgs) == 1
        assert msgs[0]["role"] == "system"
        # Storage is *not* mutated by the read.
        assert len(ctx.turns) == 1


class TestSequencingGuards:
    def test_add_assistant_without_user_raises(self) -> None:
        ctx = AgentContext(SYSTEM_PROMPT)
        try:
            ctx.add_assistant("oops", tool_calls=[])
        except RuntimeError:
            return
        raise AssertionError("expected RuntimeError")

    def test_add_tool_result_without_assistant_raises(self) -> None:
        ctx = AgentContext(SYSTEM_PROMPT)
        ctx.add_user("hi")
        try:
            ctx.add_tool_result("id", "name", {}, is_error=False)
        except RuntimeError:
            return
        raise AssertionError("expected RuntimeError")
