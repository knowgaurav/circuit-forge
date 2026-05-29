"""OpenAI-compatible tool definitions the course-generation LLM can call.

These JSON schemas are what we hand to the LLM as its available "functions".
They describe *what* each tool does and *what arguments* it takes; the actual
work happens in the matching handler (see :mod:`.handler`).

The four tools form the circuit-design workflow we steer the model through:

1. ``get_available_components`` — "what parts exist?" (call first)
2. ``get_component_schema``     — "what pins does AND_2 have?" (call per type)
3. ``validate_blueprint``       — "is my design wired correctly?" (call last)
4. ``get_circuit_state``        — "what's already on the user's canvas?"

Keeping the schemas in their own module means the handler file stays focused
on behavior, and anyone tweaking a description or parameter only touches this
one data file.
"""

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
