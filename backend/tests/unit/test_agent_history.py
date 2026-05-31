"""Unit tests for replaying prior chat history into the agent context."""

from app.api.agent import MAX_HISTORY_MESSAGES, ChatMessage, _seed_history
from app.services.agent.context import AgentContext


def test_seed_history_pairs_user_and_assistant_turns() -> None:
    context = AgentContext("system")
    history = [
        ChatMessage(role="user", text="add an AND gate"),
        ChatMessage(role="assistant", text="Done, added AND1."),
        ChatMessage(role="user", text="add an LED"),
        ChatMessage(role="assistant", text="Added LED1."),
    ]

    _seed_history(context, history)

    messages = context.messages_for_llm(max_tokens=10_000)
    # system + 2 user + 2 assistant
    roles = [m["role"] for m in messages]
    assert roles == ["system", "user", "assistant", "user", "assistant"]
    assert messages[1]["content"] == "add an AND gate"
    assert messages[2]["content"] == "Done, added AND1."


def test_seed_history_caps_to_max_messages() -> None:
    context = AgentContext("system")
    history = [
        ChatMessage(role="user" if i % 2 == 0 else "assistant", text=f"m{i}")
        for i in range(MAX_HISTORY_MESSAGES + 10)
    ]

    _seed_history(context, history)

    messages = context.messages_for_llm(max_tokens=10_000)
    # Only the system prompt plus at most MAX_HISTORY_MESSAGES are seeded
    # (the context's own sliding window may trim further).
    assert len(messages) - 1 <= MAX_HISTORY_MESSAGES


def test_seed_history_ignores_leading_assistant_message() -> None:
    """An assistant message with no open user turn is skipped, not crashed."""
    context = AgentContext("system")
    history = [ChatMessage(role="assistant", text="orphan reply")]

    _seed_history(context, history)

    messages = context.messages_for_llm(max_tokens=10_000)
    assert messages == [{"role": "system", "content": "system"}]


def test_seed_history_empty_is_noop() -> None:
    context = AgentContext("system")
    _seed_history(context, [])
    messages = context.messages_for_llm(max_tokens=10_000)
    assert messages == [{"role": "system", "content": "system"}]
