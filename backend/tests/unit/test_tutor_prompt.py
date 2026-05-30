"""Unit tests for the tutor system prompt builder (in-course-ai-tutor R4)."""

from __future__ import annotations

from app.services.agent.prompt import LevelContext, build_tutor_system_prompt
from app.services.agent.tool_selection import select_tools


def _level() -> LevelContext:
    return LevelContext(
        title="Build an AND gate",
        objectives=["Understand AND logic", "Wire a 2-input AND gate"],
        expected_behavior="The LED lights only when both switches are ON.",
        components_needed=["SWITCH_TOGGLE x2", "AND_2 x1", "LED_RED x1"],
        build_steps=["Place the switches", "Place the AND gate", "Wire them up"],
        common_mistakes=["Leaving an input floating"],
    )


def test_theory_prompt_has_objectives_but_no_build_steps() -> None:
    prompt = build_tutor_system_prompt(_level(), "theory")

    assert "Build an AND gate" in prompt
    assert "Understand AND logic" in prompt
    # Practical-only sections must be absent on theory.
    assert "Build steps:" not in prompt
    assert "Components needed:" not in prompt
    assert "Expected behavior:" not in prompt


def test_practical_prompt_includes_practical_sections() -> None:
    prompt = build_tutor_system_prompt(_level(), "practical")

    assert "Components needed:" in prompt
    assert "SWITCH_TOGGLE x2" in prompt
    assert "Build steps:" in prompt
    assert "Wire them up" in prompt
    assert "Expected behavior: The LED lights only when both switches are ON." in prompt
    assert "Common mistakes to watch for:" in prompt
    assert "Leaving an input floating" in prompt


def test_tool_list_matches_select_tools_per_mode() -> None:
    for mode in ("theory", "practical"):
        prompt = build_tutor_system_prompt(_level(), mode)
        for name in select_tools(mode):
            assert name in prompt
        # A mutation tool must not be named on the theory step.
        if mode == "theory":
            assert "add_wire" not in prompt


def test_common_mistakes_omitted_when_empty() -> None:
    level = _level()
    level.common_mistakes = []
    prompt = build_tutor_system_prompt(level, "practical")
    assert "Common mistakes to watch for:" not in prompt
