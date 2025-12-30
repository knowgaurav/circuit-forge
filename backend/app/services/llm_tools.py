"""
LLM Tool Functions - OpenAI-compatible tool definitions and handlers.
"""

import json
from typing import Any, Dict, List, Optional

from app.services.component_registry import ComponentRegistry, get_component_registry


# OpenAI-compatible tool definitions
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_available_components",
            "description": "Get all available circuit components grouped by category. Call this first before designing any circuit to see what components are available.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_component_schema",
            "description": "Get detailed schema for a specific component including pin names, types, and connection rules. Call this for each component type you want to use to get exact pin names.",
            "parameters": {
                "type": "object",
                "properties": {
                    "component_type": {
                        "type": "string",
                        "description": "The component type (e.g., 'AND_2', 'LED_RED', 'SWITCH_TOGGLE')",
                    }
                },
                "required": ["component_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "validate_blueprint",
            "description": "Validate a circuit blueprint before returning it. Checks for valid components, pin names, and connection rules. Always call this before returning a blueprint.",
            "parameters": {
                "type": "object",
                "properties": {
                    "blueprint": {
                        "type": "object",
                        "description": "The circuit blueprint with components and wires arrays",
                        "properties": {
                            "components": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "type": {"type": "string"},
                                        "label": {"type": "string"},
                                        "position": {
                                            "type": "object",
                                            "properties": {
                                                "x": {"type": "number"},
                                                "y": {"type": "number"},
                                            },
                                        },
                                    },
                                },
                            },
                            "wires": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "from": {"type": "string"},
                                        "to": {"type": "string"},
                                    },
                                },
                            },
                        },
                    }
                },
                "required": ["blueprint"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_circuit_state",
            "description": "Get the current state of the user's circuit including components, wires, and simulation results. Use this when helping users debug or modify existing circuits.",
            "parameters": {
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session ID to get state for",
                    }
                },
                "required": ["session_id"],
            },
        },
    },
]


class ToolHandler:
    """Handles execution of LLM tool calls."""

    def __init__(self, registry: Optional[ComponentRegistry] = None):
        self.registry = registry or get_component_registry()
        self._circuit_states: Dict[str, Dict[str, Any]] = {}

    def handle_tool_call(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Route tool calls to appropriate handlers."""
        handlers = {
            "get_available_components": self._handle_get_components,
            "get_component_schema": self._handle_get_schema,
            "validate_blueprint": self._handle_validate,
            "get_circuit_state": self._handle_get_state,
        }
        handler = handlers.get(name)
        if not handler:
            return {"success": False, "error": f"Unknown tool: {name}"}
        try:
            return handler(arguments)
        except Exception as e:
            return {"success": False, "error": str(e)}

    def set_circuit_state(self, session_id: str, state: Dict[str, Any]) -> None:
        """Store circuit state for a session."""
        self._circuit_states[session_id] = state

    def _handle_get_components(self, args: Dict[str, Any]) -> Dict[str, Any]:
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

    def _handle_get_schema(self, args: Dict[str, Any]) -> Dict[str, Any]:
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

    def _handle_validate(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a circuit blueprint."""
        blueprint = args.get("blueprint", {})
        errors: List[str] = []
        warnings: List[str] = []

        components = blueprint.get("components", [])
        wires = blueprint.get("wires", [])

        # Build label -> component map
        labels: Dict[str, Dict[str, Any]] = {}
        for comp in components:
            label = comp.get("label", "")
            comp_type = comp.get("type", "")
            
            # Check for duplicate labels
            if label in labels:
                errors.append(f"Duplicate component label: {label}")
                continue
            
            # Validate component type exists
            comp_def = self.registry.get_component(comp_type)
            if not comp_def:
                similar = self.registry.search_components(comp_type)
                suggestions = [s.type for s in similar[:3]]
                hint = f" Did you mean: {', '.join(suggestions)}?" if suggestions else ""
                errors.append(f"Unknown component type: {comp_type}.{hint}")
                continue
            
            labels[label] = {
                "type": comp_type,
                "definition": comp_def,
                "position": comp.get("position", {}),
            }
            
            # Validate position bounds
            pos = comp.get("position", {})
            if pos.get("x", 0) < 0 or pos.get("y", 0) < 0:
                warnings.append(f"Component {label} has negative position")

        # Track drivers per input pin (to detect multiple drivers)
        input_drivers: Dict[str, str] = {}
        
        # Validate wires
        for wire in wires:
            from_str = wire.get("from", "")
            to_str = wire.get("to", "")
            
            # Parse wire endpoints
            from_parts = from_str.split(":")
            to_parts = to_str.split(":")
            
            if len(from_parts) != 2:
                errors.append(f"Invalid wire source format: {from_str} (expected 'LABEL:PIN')")
                continue
            if len(to_parts) != 2:
                errors.append(f"Invalid wire target format: {to_str} (expected 'LABEL:PIN')")
                continue
            
            from_label, from_pin = from_parts
            to_label, to_pin = to_parts
            
            # Check source component exists
            if from_label not in labels:
                errors.append(f"Wire source component not found: {from_label}")
                continue
            
            # Check target component exists
            if to_label not in labels:
                errors.append(f"Wire target component not found: {to_label}")
                continue
            
            # Validate source pin exists
            from_comp = labels[from_label]
            from_def = from_comp.get("definition")
            if from_def:
                valid_pins = [p.name for p in from_def.pins]
                if from_pin not in valid_pins:
                    errors.append(
                        f"Invalid pin '{from_pin}' on {from_label} ({from_comp['type']}). "
                        f"Valid pins: {', '.join(valid_pins)}"
                    )
            
            # Validate target pin exists
            to_comp = labels[to_label]
            to_def = to_comp.get("definition")
            if to_def:
                valid_pins = [p.name for p in to_def.pins]
                if to_pin not in valid_pins:
                    errors.append(
                        f"Invalid pin '{to_pin}' on {to_label} ({to_comp['type']}). "
                        f"Valid pins: {', '.join(valid_pins)}"
                    )
            
            # Check for multiple drivers to same input
            to_key = f"{to_label}:{to_pin}"
            if to_key in input_drivers:
                existing_driver = input_drivers[to_key]
                errors.append(
                    f"Output conflict: {to_key} has multiple drivers "
                    f"({existing_driver} and {from_str})"
                )
            else:
                input_drivers[to_key] = from_str
            
            # Check output-to-output connections
            if from_def and to_def:
                from_pin_def = next((p for p in from_def.pins if p.name == from_pin), None)
                to_pin_def = next((p for p in to_def.pins if p.name == to_pin), None)
                
                if from_pin_def and to_pin_def:
                    if from_pin_def.type == "output" and to_pin_def.type == "output":
                        errors.append(
                            f"Invalid connection: output '{from_str}' connected to output '{to_str}'"
                        )
                    elif from_pin_def.type == "input" and to_pin_def.type == "input":
                        errors.append(
                            f"Invalid connection: input '{from_str}' connected to input '{to_str}'"
                        )

        if errors:
            return {
                "success": False,
                "errors": errors,
                "warnings": warnings,
            }
        
        return {
            "success": True,
            "warnings": warnings,
            "message": "Blueprint is valid",
            "component_count": len(components),
            "wire_count": len(wires),
        }

    def _handle_get_state(self, args: Dict[str, Any]) -> Dict[str, Any]:
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
_tool_handler: Optional[ToolHandler] = None


def get_tool_handler() -> ToolHandler:
    """Get the singleton tool handler instance."""
    global _tool_handler
    if _tool_handler is None:
        _tool_handler = ToolHandler()
    return _tool_handler
