"""Agent API endpoint (Story B — B.11).

``POST /api/agent/turn`` runs one ReAct iteration loop and returns the trace
plus the final message. Request and response use camelCase aliases for the
fields that the contracts file specifies as camelCase
(``providerId``/``apiKey``/``finalMessage``/``tokensIn``/``tokensOut``/
``abortReason``).

The live tools registry is imported *lazily inside the handler* so this
module can be imported (and the router registered) before the parallel
``storyB-tools`` lane lands. If ``app.services.agent.tools`` is missing at
request time we surface a 503 with a structured error rather than crashing
at import time.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import db_manager
from app.models.circuit import CircuitState
from app.repositories.agent_trace_repository import AgentTraceRepository
from app.repositories.course_repository import (
    CoursePlanRepository,
    LevelContentRepository,
)
from app.repositories.event_repository import EventRepository
from app.services.agent.context import AgentContext
from app.services.agent.course_session import (
    CircuitMutation,
    build_tool_registry,
    collect_mutations,
    discard_session,
    seed_session,
)
from app.services.agent.framing import render_circuit_framing
from app.services.agent.orchestrator import Orchestrator
from app.services.agent.prompt import LevelContext, build_tutor_system_prompt
from app.services.agent.schemas import TOOL_SCHEMAS
from app.services.agent.tool_selection import select_tools
from app.services.agent.tools import ToolDeps
from app.services.component_registry import get_component_registry
from app.services.circuit_service import CircuitService
from app.services.llm_provider_factory import LLMProviderFactory
from app.services.simulation_engine import SimulationEngine


router = APIRouter()


SYSTEM_PROMPT = (
    "You are a circuit-design assistant for CircuitForge. You have a small "
    "set of tools that read and modify the current session's circuit. "
    "Call the smallest sequence of tools needed to answer the user, then "
    "reply with a short, concrete final message. Do not invent component "
    "types or pin names that the tools do not return."
)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class AgentTurnRequest(BaseModel):
    """``POST /api/agent/turn`` request body."""

    session_id: str = Field(alias="sessionId")
    actor_id: str = Field(alias="actorId")
    message: str
    provider_id: str = Field(alias="providerId")
    api_key: str = Field(alias="apiKey")
    model: str

    model_config = {"populate_by_name": True}


class AgentTurnResponse(BaseModel):
    """``POST /api/agent/turn`` response body."""

    trace: list[dict]
    final_message: str = Field(alias="finalMessage")
    tokens_in: int = Field(alias="tokensIn")
    tokens_out: int = Field(alias="tokensOut")
    iterations: int
    aborted: bool
    abort_reason: str | None = Field(alias="abortReason")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# DI
# ---------------------------------------------------------------------------


def get_trace_repository() -> AgentTraceRepository:
    """Build the trace repo against the live database."""
    return AgentTraceRepository(db_manager.get_database())


def get_orchestrator() -> Orchestrator:
    """One Orchestrator per request — it's stateless."""
    return Orchestrator(provider_factory=LLMProviderFactory.get_provider)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/agent/turn", response_model=AgentTurnResponse)
async def agent_turn(
    req: AgentTurnRequest,
    trace_repo: AgentTraceRepository = Depends(get_trace_repository),
    orchestrator: Orchestrator = Depends(get_orchestrator),
) -> AgentTurnResponse:
    """Run a single ReAct turn against the user's session."""
    # Cross-lane stitch: the tools registry lives in `storyB-tools` and may
    # not have landed yet when this endpoint is registered. Import lazily so
    # the router itself is always importable; surface a clear 503 if the
    # tools module is genuinely missing at request time.
    try:
        from app.services.agent.tools import TOOLS  # type: ignore[attr-defined]
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "AGENT_TOOLS_UNAVAILABLE",
                    "message": "The agent tools registry is not available on this deploy.",
                    "details": str(exc),
                }
            },
        )

    context = AgentContext(SYSTEM_PROMPT)
    result = await orchestrator.run_turn(
        session_id=req.session_id,
        actor_id=req.actor_id,
        message=req.message,
        provider_id=req.provider_id,
        api_key=req.api_key,
        model=req.model,
        tools_registry=TOOLS,
        context=context,
        trace_repo=trace_repo,
        allowed_tools=set(TOOL_SCHEMAS),
    )

    return AgentTurnResponse(
        trace=result.trace,
        finalMessage=result.final_message,
        tokensIn=result.tokens_in,
        tokensOut=result.tokens_out,
        iterations=result.iterations,
        aborted=result.aborted,
        abortReason=result.abort_reason,
    )


# ---------------------------------------------------------------------------
# Course-turn endpoint (in-course-ai-tutor)
# ---------------------------------------------------------------------------


class CourseTurnRequest(BaseModel):
    """``POST /api/agent/course-turn`` request body.

    ``circuit`` is the learner's current board snapshot — the tutor's "eyes".
    The LLM provider/key/model arrive per request and are never stored.
    """

    actor_id: str = Field(alias="actorId")
    message: str
    course_id: str = Field(alias="courseId")
    level_number: int = Field(alias="levelNumber")
    mode: Literal["theory", "practical"]
    circuit: CircuitState
    provider_id: str = Field(alias="providerId")
    api_key: str = Field(alias="apiKey")
    model: str

    model_config = {"populate_by_name": True}


class CourseTurnResponse(BaseModel):
    """``POST /api/agent/course-turn`` response body."""

    final_message: str = Field(alias="finalMessage")
    mutations: list[CircuitMutation]
    trace: list[dict]
    tokens_in: int = Field(alias="tokensIn")
    tokens_out: int = Field(alias="tokensOut")
    iterations: int
    aborted: bool
    abort_reason: str | None = Field(alias="abortReason")

    model_config = {"populate_by_name": True}


def get_level_content_repository() -> LevelContentRepository:
    """Build the level-content repo against the live database."""
    return LevelContentRepository(db_manager.get_database())


def get_course_plan_repository() -> CoursePlanRepository:
    """Build the course-plan repo against the live database."""
    return CoursePlanRepository(db_manager.get_database())


def get_circuit_service() -> CircuitService:
    """Build a CircuitService against the live database."""
    return CircuitService(db_manager.get_database())


def get_event_repository() -> EventRepository:
    """Build the event repo against the live database."""
    return EventRepository(db_manager.get_database())


def _project_level_context(content, title: str) -> LevelContext:
    """Project a ``LevelContent`` document into the bounded prompt context."""
    theory = content.theory
    practical = content.practical
    objectives = list(theory.objectives) if theory else []
    if practical:
        components_needed = [
            f"{c.type} x{c.count}" for c in practical.components_needed
        ]
        build_steps = [s.instruction for s in practical.steps]
        expected_behavior = practical.expected_behavior
        common_mistakes = list(practical.common_mistakes)
    else:
        components_needed = []
        build_steps = []
        expected_behavior = ""
        common_mistakes = []
    return LevelContext(
        title=title,
        objectives=objectives,
        expected_behavior=expected_behavior,
        components_needed=components_needed,
        build_steps=build_steps,
        common_mistakes=common_mistakes,
    )


@router.post("/agent/course-turn", response_model=CourseTurnResponse)
async def agent_course_turn(
    req: CourseTurnRequest,
    trace_repo: AgentTraceRepository = Depends(get_trace_repository),
    orchestrator: Orchestrator = Depends(get_orchestrator),
    level_repo: LevelContentRepository = Depends(get_level_content_repository),
    plan_repo: CoursePlanRepository = Depends(get_course_plan_repository),
    circuit_service: CircuitService = Depends(get_circuit_service),
    event_repo: EventRepository = Depends(get_event_repository),
) -> CourseTurnResponse:
    """Run one tutor turn against an ephemeral session seeded from the board."""
    plan = await plan_repo.get_by_id(req.course_id)
    if plan is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Course not found"}},
        )
    outline = next(
        (lvl for lvl in plan.levels if lvl.level_number == req.level_number), None
    )
    if outline is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Level not found"}},
        )

    content = await level_repo.get_by_course_and_level(
        req.course_id, req.level_number
    )
    if content is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "LEVEL_CONTENT_UNAVAILABLE",
                    "message": "Level content has not been generated yet.",
                }
            },
        )

    level = _project_level_context(content, outline.title)
    system_prompt = build_tutor_system_prompt(level, req.mode)
    allowed = select_tools(req.mode)

    deps = ToolDeps(
        circuit_service=circuit_service,
        simulation_engine_factory=SimulationEngine,
        component_registry=get_component_registry(),
    )

    session_id = await seed_session(circuit_service, req.circuit)
    base_seq = await event_repo.get_latest_seq(session_id)
    tools_registry = build_tool_registry(deps, session_id, req.actor_id)

    try:
        context = AgentContext(system_prompt)
        framing = render_circuit_framing(req.circuit)
        result = await orchestrator.run_turn(
            session_id=session_id,
            actor_id=req.actor_id,
            message=f"{framing}\n\n{req.message}",
            provider_id=req.provider_id,
            api_key=req.api_key,
            model=req.model,
            tools_registry=tools_registry,
            context=context,
            trace_repo=trace_repo,
            allowed_tools=allowed,
        )
        events = await event_repo.get_events_since_seq(session_id, base_seq)
        mutations = collect_mutations(events)
    finally:
        await discard_session(circuit_service, event_repo, session_id)

    return CourseTurnResponse(
        finalMessage=result.final_message,
        mutations=mutations,
        trace=result.trace,
        tokensIn=result.tokens_in,
        tokensOut=result.tokens_out,
        iterations=result.iterations,
        aborted=result.aborted,
        abortReason=result.abort_reason,
    )
