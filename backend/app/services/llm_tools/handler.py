"""Tool-call execution — routes a tool name to its handler and encodes output.

Why this module exists separately
---------------------------------
This is the runtime half of the LLM tool system. The LLM picks a tool (from
:mod:`.definitions`) and sends a name + arguments; ``ToolHandler`` runs the
matching method and hands the result back.

Token efficiency
----------------
By default results are encoded as TOON (a compact, token-cheap format) via
``encode_for_llm`` rather than verbose JSON, because every token in the tool
result counts against the model's context budget. Pass ``use_toon=False`` to
get the raw ``dict`` back (handy for tests and debugging).

Example
-------
    handler = get_tool_handler()
    handler.handle_tool_call("get_component_schema", {"component_type": "AND_2"})
    # -> TOON-encoded string describing AND_2's pins and connection rules.

The heavy ``validate_blueprint`` logic lives in :mod:`.blueprint_validator`;
this class just delegates to it.
"""

from typing import Any, Literal, overload

from app.services.component_registry import ComponentRegistry, get_component_registry
from app.services.toon_encoder import encode_for_llm

from .blueprint_validator import validate_blueprint


class ToolHandler:
    """Handles execution of LLM tool calls."""

    def __init__(self, registry: ComponentRegistry | None = None):
        self.registry = registry or get_component_registry()
        self._circuit_states: dict[str, dict[str, Any]] = {}

    @overload
    def handle_tool_call(
        self, name: str, arguments: dict[str, Any], use_toon: Literal[True] = ...
    ) -> str: ...

    @overload
    def handle_tool_call(
        self, name: str, arguments: dict[str, Any], use_toon: Literal[False]
    ) -> dict[str, Any]: ...

    def handle_tool_call(
        self, name: str, arguments: dict[str, Any], use_toon: bool = True
    ) -> dict[str, Any] | str:
        """Route tool calls to appropriate handlers.

        Args:
            name: Tool function name
            arguments: Tool arguments
            use_toon: If True, encode response as TOON for token efficiency

        Returns:
            Tool response as dict (JSON) or str (TOON)
        """
        handlers = {
            "get_available_components": self._handle_get_components,
            "get_component_schema": self._handle_get_schema,
            "validate_blueprint": self._handle_validate,
            "get_circuit_state": self._handle_get_state,
        }
        handler = handlers.get(name)
        if not handler:
            result = {"success": False, "error": f"Unknown tool: {name}"}
            return encode_for_llm(result) if use_toon else result
        try:
            result = handler(arguments)
            return encode_for_llm(result) if use_toon else result
        except Exception as e:
            result = {"success": False, "error": str(e)}
            return encode_for_llm(result) if use_toon else result

    def set_circuit_state(self, session_id: str, state: dict[str, Any]) -> None:
        """Store circuit state for a session."""
        self._circuit_states[session_id] = state

    def _handle_get_components(self, args: dict[str, Any]) -> dict[str, Any]:
        """Return all components grouped by category."""
        components = self.registry.get_all_components()
        return {
            "success": True,
            "categories": {
                category: [
                    {
                        "type": c.type,
                        "name": c.name,
                        "description": c.description,
                    }
                    for c in comps
                ]
                for category, comps in components.items()
            },
        }

    def _handle_get_schema(self, args: dict[str, Any]) -> dict[str, Any]:
        """Return detailed schema for a component."""
        comp_type = args.get("component_type", "")
        component = self.registry.get_component(comp_type)

        if not component:
            similar = self.registry.search_components(comp_type)
            suggestions = [s.type for s in similar[:5]]
            return {
                "success": False,
                "error": f"Unknown component type: {comp_type}",
                "hint": f"Did you mean: {', '.join(suggestions)}?" if suggestions else "No similar components found.",
            }

        return {
            "success": True,
            "component": {
                "type": component.type,
                "name": component.name,
                "category": component.category,
                "description": component.description,
                "width": component.width,
                "height": component.height,
                "pins": [
                    {"name": p.name, "type": p.type}
                    for p in component.pins
                ],
                "connection_rules": {
                    pin_name: {
                        "can_connect_to": rule.can_connect_to,
                        "max_connections": rule.max_connections,
                    }
                    for pin_name, rule in component.connection_rules.items()
                },
                "example_connections": component.example_connections,
            },
        }

    def _handle_validate(self, args: dict[str, Any]) -> dict[str, Any]:
        """Validate a circuit blueprint for completeness and correctness."""
        blueprint = args.get("blueprint", {})
        return validate_blueprint(self.registry, blueprint)

    def _handle_get_state(self, args: dict[str, Any]) -> dict[str, Any]:
        """Return current circuit state for a session."""
        session_id = args.get("session_id", "")

        if not session_id:
            return {
                "success": False,
                "error": "session_id is required",
            }

        state = self._circuit_states.get(session_id)

        if not state:
            return {
                "success": True,
                "message": "No circuit state found for this session",
                "components": [],
                "wires": [],
                "simulation_result": None,
            }

        return {
            "success": True,
            "components": state.get("components", []),
            "wires": state.get("wires", []),
            "simulation_result": state.get("simulation_result"),
        }


# Singleton instance
_tool_handler: ToolHandler | None = None


def get_tool_handler() -> ToolHandler:
    """Get the singleton tool handler instance."""
    global _tool_handler
    if _tool_handler is None:
        _tool_handler = ToolHandler()
    return _tool_handler
