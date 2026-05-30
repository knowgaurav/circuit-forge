"""Property tests for tool scoping (in-course-ai-tutor PBT-3).

Invariants over ``select_tools``:

* The selected set is always a subset of ``TOOL_SCHEMAS`` keys (no tool is
  ever offered that the orchestrator can't dispatch).
* ``theory`` mode never offers a mutation tool.
* ``practical`` ⊇ ``theory`` (the build step is strictly more permissive).
"""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from app.services.agent.schemas import TOOL_SCHEMAS
from app.services.agent.tool_selection import select_tools

_MUTATION = {
    "add_component",
    "remove_component",
    "add_wire",
    "remove_wire",
    "move_component",
}


@given(mode=st.sampled_from(["theory", "practical"]))
def test_selection_is_subset_of_registry(mode: str) -> None:
    assert select_tools(mode).issubset(set(TOOL_SCHEMAS))


@given(mode=st.just("theory"))
def test_theory_never_offers_mutation_tools(mode: str) -> None:
    assert select_tools(mode).isdisjoint(_MUTATION)


def test_practical_superset_of_theory() -> None:
    assert select_tools("theory").issubset(select_tools("practical"))
