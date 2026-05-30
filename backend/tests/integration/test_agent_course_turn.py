"""Integration test for POST /api/agent/course-turn (in-course-ai-tutor).

Drives one tutor turn end-to-end against a stubbed LLM provider that emits a
scripted ``add_wire`` tool call. Asserts the response carries a ``WIRE_ADDED``
mutation and that the ephemeral session is discarded afterward.

The DB layer is the in-memory ``_FakeDatabase`` from the unit tests, wired
through FastAPI dependency overrides. The orchestrator is overridden with one
built from a scripted ``FakeProvider``.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi.testclient import TestClient

from app.api.agent import (
    get_circuit_service,
    get_event_repository,
    get_course_plan_repository,
    get_level_content_repository,
    get_orchestrator,
    get_trace_repository,
)
from app.main import app
from app.models.circuit import CircuitState
from app.models.course import (
    CoursePlan,
    Difficulty,
    LevelContent,
    LevelOutline,
)
from app.repositories.course_repository import (
    CoursePlanRepository,
    LevelContentRepository,
)
from app.repositories.event_repository import EventRepository
from app.services.agent.orchestrator import Orchestrator
from app.services.circuit_service import CircuitService
from app.services.llm_providers import LLMRequest, LLMResponse
from tests.factories import ComponentFactory, WireFactory
from tests.unit.test_agent_tools import _FakeDatabase


COURSE_ID = "course-1"


class _ScriptedProvider:
    """Emits an ``add_wire`` tool call, then a final message."""

    def __init__(self) -> None:
        self.calls: list[LLMRequest] = []
        self._responses = [
            LLMResponse(
                raw_content="Connecting the gate to the LED.",
                tool_calls=[
                    {
                        "id": "call-1",
                        "type": "function",
                        "function": {
                            "name": "add_wire",
                            "arguments": json.dumps(
                                {
                                    "session_id": "ignored",
                                    "actor_id": "tutor-agent",
                                    "from_label": "AND1",
                                    "from_pin": "Y",
                                    "to_label": "LED1",
                                    "to_pin": "IN",
                                }
                            ),
                        },
                    }
                ],
                token_usage=0,
            ),
            LLMResponse(
                raw_content="Done — AND1:Y now drives LED1:IN.",
                tool_calls=[],
                token_usage=0,
            ),
        ]

    async def call(self, api_key: str, request: LLMRequest) -> LLMResponse:
        self.calls.append(request)
        return self._responses.pop(0)


class _FakeTraceRepo:
    async def append_trace(self, **kwargs: Any) -> None:
        return None


def _client_circuit() -> dict[str, Any]:
    """Board with AND1 and LED1 present but not yet wired."""
    and_gate = ComponentFactory.create_and_gate(id="and-1")
    and_gate.properties["label"] = "AND1"
    led = ComponentFactory.create_led(id="led-1")
    led.properties["label"] = "LED1"
    state = CircuitState(
        sessionId="CLIENT",
        version=0,
        components=[and_gate, led],
        wires=[],
        annotations=[],
        updatedAt=datetime.utcnow(),
    )
    return state.model_dump(by_alias=True, mode="json")


def _seed_course(db: _FakeDatabase) -> None:
    """Persist a course plan + generated level content into the fake DB."""
    plan = CoursePlan(
        id=COURSE_ID,
        topic="logic gates",
        title="Logic Gates",
        description="Learn logic gates by building circuits.",
        difficulty=Difficulty.BEGINNER,
        estimatedHours=3,
        levels=[
            LevelOutline(
                levelNumber=i,
                title=f"Level {i}",
                description=f"Description for level {i}.",
            )
            for i in range(1, 9)
        ],
    )
    content = LevelContent(
        id="content-1",
        coursePlanId=COURSE_ID,
        levelNumber=1,
        generationState="generated",
        theory={
            "objectives": ["Understand AND logic", "Wire an AND gate"],
            "conceptExplanation": "An AND gate outputs HIGH only when all its "
            "inputs are HIGH. " + "It is a fundamental building block. " * 5,
            "realWorldExamples": ["Safety interlocks"],
            "keyTerms": [],
        },
        practical={
            "componentsNeeded": [{"type": "AND_2", "count": 1}],
            "steps": [
                {"stepNumber": 1, "instruction": "Place the AND gate on the board."}
            ],
            "expectedBehavior": "The LED lights when both inputs are HIGH.",
            "validationCriteria": {},
            "commonMistakes": [],
            "circuitBlueprint": None,
        },
    )

    plan_repo = CoursePlanRepository(db)
    level_repo = LevelContentRepository(db)

    import asyncio

    async def _insert() -> None:
        await plan_repo.insert_one(plan)
        await level_repo.insert_one(content)

    asyncio.get_event_loop().run_until_complete(_insert())


def test_course_turn_applies_add_wire_and_discards_session() -> None:
    db = _FakeDatabase()
    _seed_course(db)

    circuit_service = CircuitService(db)
    event_repo = EventRepository(db)
    provider = _ScriptedProvider()
    orchestrator = Orchestrator(provider_factory=lambda _pid: provider)

    app.dependency_overrides[get_trace_repository] = lambda: _FakeTraceRepo()
    app.dependency_overrides[get_orchestrator] = lambda: orchestrator
    app.dependency_overrides[get_level_content_repository] = (
        lambda: LevelContentRepository(db)
    )
    app.dependency_overrides[get_course_plan_repository] = (
        lambda: CoursePlanRepository(db)
    )
    app.dependency_overrides[get_circuit_service] = lambda: circuit_service
    app.dependency_overrides[get_event_repository] = lambda: event_repo

    try:
        client = TestClient(app)
        response = client.post(
            "/api/agent/course-turn",
            json={
                "actorId": "learner-1",
                "message": "connect the AND gate output to the LED",
                "courseId": COURSE_ID,
                "levelNumber": 1,
                "mode": "practical",
                "circuit": _client_circuit(),
                "providerId": "openai",
                "apiKey": "k",
                "model": "gpt-4o-mini",
            },
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["aborted"] is False
        wire_mutations = [
            m for m in data["mutations"] if m["type"] == "WIRE_ADDED"
        ]
        assert len(wire_mutations) == 1
        wire = wire_mutations[0]["payload"]["wire"]
        assert wire["fromComponentId"] == "and-1"
        assert wire["toComponentId"] == "led-1"
        assert "AND1:Y -> LED1:IN" in data["finalMessage"] or data["finalMessage"]
    finally:
        app.dependency_overrides.clear()

    # The ephemeral session must be gone after the turn — no events remain.
    import asyncio

    remaining = asyncio.get_event_loop().run_until_complete(
        db["events"].count_documents({})
    )
    assert remaining == 0
