"""Shared types for the agent tools package.

Three pieces live here so every tool file can import them without pulling in
sibling tool implementations:

``ToolFn``
    The async callable shape every tool follows:
    ``async def fn(args, *, deps: ToolDeps) -> SomeResult``.

``ToolDeps``
    A small dataclass bag of services. The orchestrator builds one per
    request and threads it through every tool call. ``simulation_engine_factory``
    is a zero-arg callable so each ``simulate`` (or ``explain_signal_path``)
    invocation gets a fresh engine instance and never shares mutable state.

``ToolError``
    Structured failure type that the orchestrator catches and converts into
    a tool result the LLM can see, without aborting the agent loop. The
    ``code`` is a stable machine string ("UNKNOWN_COMPONENT_TYPE",
    "COMPONENT_NOT_FOUND", …) and ``details`` is human-readable context.

Example::

    deps = ToolDeps(
        circuit_service=service,
        simulation_engine_factory=lambda: SimulationEngine(registry),
        component_registry=registry,
    )

    try:
        result = await get_circuit_state(args, deps=deps)
    except ToolError as exc:
        # exc.code, exc.details — surfaced to the LLM as a structured failure.
        ...
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Awaitable, Callable

from pydantic import BaseModel

from app.services.circuit_service import CircuitService
from app.services.component_registry import ComponentRegistry
from app.services.simulation_engine import SimulationEngine


ToolFn = Callable[..., Awaitable[BaseModel]]
"""Signature of every tool: ``async def fn(args, *, deps) -> Result``."""


@dataclass
class ToolDeps:
    """Services a tool needs at call time.

    The orchestrator builds one instance per request and passes it into every
    tool invocation. ``simulation_engine_factory`` is a zero-arg callable so
    each ``simulate`` call gets a fresh engine without sharing mutable state.
    """

    circuit_service: CircuitService
    simulation_engine_factory: Callable[[], SimulationEngine]
    component_registry: ComponentRegistry


class ToolError(Exception):
    """Structured tool failure surfaced to the orchestrator.

    The orchestrator catches this and renders it as a tool result the LLM
    sees, without aborting the loop.
    """

    def __init__(self, code: str, details: str) -> None:
        self.code = code
        self.details = details
        super().__init__(f"{code}: {details}")
