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

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import db_manager
from app.repositories.agent_trace_repository import AgentTraceRepository
from app.services.agent.context import AgentContext
from app.services.agent.orchestrator import Orchestrator
from app.services.agent.schemas import TOOL_SCHEMAS
from app.services.llm_provider_factory import LLMProviderFactory


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
