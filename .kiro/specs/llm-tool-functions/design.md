# Design Document: LLM Tool Functions

## Overview

This design implements OpenAI-compatible tool functions that allow the LLM to dynamically query component specifications and validate circuit blueprints before generation. This ensures accurate circuit generation that works correctly with the simulation engine.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ Course Page │    │ Playground  │    │ Component Registry  │ │
│  └──────┬──────┘    └──────┬──────┘    │ (constants/         │ │
│         │                  │           │  components.ts)     │ │
│         │                  │           └──────────┬──────────┘ │
└─────────┼──────────────────┼────────────────────┼─────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend API                               │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │ /api/components │    │           LLM Service                │ │
│  │ /api/components │    │  ┌─────────────────────────────┐   │ │
│  │   /{type}       │◄───┤  │      Tool Functions         │   │ │
│  └─────────────────┘    │  │  - get_available_components │   │ │
│                         │  │  - get_component_schema     │   │ │
│  ┌─────────────────┐    │  │  - validate_blueprint       │   │ │
│  │ Component       │◄───┤  │  - get_circuit_state        │   │ │
│  │ Registry        │    │  └─────────────────────────────┘   │ │
│  │ (Python)        │    │              │                      │ │
│  └─────────────────┘    │              ▼                      │ │
│                         │  ┌─────────────────────────────┐   │ │
│                         │  │    OpenAI API (MegaLLM)     │   │ │
│                         │  │    with function calling    │   │ │
│                         │  └─────────────────────────────┘   │ │
│                         └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Component Registry (Backend)

A Python module that mirrors the frontend component definitions and serves as the source of truth for the LLM.

```python
# app/services/component_registry.py

from typing import Dict, List, Optional
from pydantic import BaseModel

class PinDefinition(BaseModel):
    name: str
    type: str  # "input" or "output"
    position: Dict[str, int]  # {"x": int, "y": int}

class ConnectionRule(BaseModel):
    can_connect_to: List[str]  # List of compatible pin types
    max_connections: int  # -1 for unlimited
    
class ComponentDefinition(BaseModel):
    type: str
    name: str
    category: str
    description: str
    width: int
    height: int
    pins: List[PinDefinition]
    properties: Dict[str, any]
    connection_rules: Dict[str, ConnectionRule]
    example_connections: List[str]  # Example valid wire patterns

class ComponentRegistry:
    def get_all_components(self) -> Dict[str, List[ComponentDefinition]]
    def get_component(self, type: str) -> Optional[ComponentDefinition]
    def get_categories(self) -> List[str]
    def search_components(self, query: str) -> List[ComponentDefinition]
```

### 2. Tool Function Definitions

OpenAI-compatible function definitions for the LLM to call.

```python
# app/services/llm_tools.py

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_available_components",
            "description": "Get all available circuit components grouped by category. Call this first before designing any circuit.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_component_schema",
            "description": "Get detailed schema for a specific component including pin names, types, and connection rules. Call this for each component type you want to use.",
            "parameters": {
                "type": "object",
                "properties": {
                    "component_type": {
                        "type": "string",
                        "description": "The component type (e.g., 'AND_2', 'LED_RED', 'SWITCH_TOGGLE')"
                    }
                },
                "required": ["component_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "validate_blueprint",
            "description": "Validate a circuit blueprint before returning it. Checks for valid components, pin names, and connection rules.",
            "parameters": {
                "type": "object",
                "properties": {
                    "blueprint": {
                        "type": "object",
                        "description": "The circuit blueprint with components and wires arrays"
                    }
                },
                "required": ["blueprint"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_circuit_state",
            "description": "Get the current state of the user's circuit including components, wires, and simulation results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session ID to get state for"
                    }
                },
                "required": ["session_id"]
            }
        }
    }
]
```

### 3. Tool Handlers

```python
# app/services/llm_tools.py

class ToolHandler:
    def __init__(self, registry: ComponentRegistry):
        self.registry = registry
    
    def handle_tool_call(self, name: str, arguments: dict) -> dict:
        """Route tool calls to appropriate handlers"""
        handlers = {
            "get_available_components": self._handle_get_components,
            "get_component_schema": self._handle_get_schema,
            "validate_blueprint": self._handle_validate,
            "get_circuit_state": self._handle_get_state,
        }
        handler = handlers.get(name)
        if not handler:
            return {"success": False, "error": f"Unknown tool: {name}"}
        return handler(arguments)
    
    def _handle_get_components(self, args: dict) -> dict:
        """Return all components grouped by category"""
        components = self.registry.get_all_components()
        return {
            "success": True,
            "categories": {
                category: [
                    {"type": c.type, "name": c.name, "description": c.description}
                    for c in comps
                ]
                for category, comps in components.items()
            }
        }
    
    def _handle_get_schema(self, args: dict) -> dict:
        """Return detailed schema for a component"""
        comp_type = args.get("component_type")
        component = self.registry.get_component(comp_type)
        if not component:
            similar = self.registry.search_components(comp_type)
            return {
                "success": False,
                "error": f"Unknown component type: {comp_type}",
                "hint": f"Did you mean: {', '.join(s.type for s in similar[:5])}?"
            }
        return {
            "success": True,
            "component": {
                "type": component.type,
                "name": component.name,
                "category": component.category,
                "description": component.description,
                "pins": [
                    {"name": p.name, "type": p.type}
                    for p in component.pins
                ],
                "connection_rules": component.connection_rules,
                "example_connections": component.example_connections
            }
        }
    
    def _handle_validate(self, args: dict) -> dict:
        """Validate a circuit blueprint"""
        blueprint = args.get("blueprint", {})
        errors = []
        warnings = []
        
        # Validate components
        for comp in blueprint.get("components", []):
            comp_def = self.registry.get_component(comp.get("type"))
            if not comp_def:
                errors.append(f"Unknown component type: {comp.get('type')}")
                continue
            # Validate position bounds
            pos = comp.get("position", {})
            if pos.get("x", 0) < 0 or pos.get("y", 0) < 0:
                warnings.append(f"Component {comp.get('label')} has negative position")
        
        # Validate wires
        labels = {c.get("label"): c for c in blueprint.get("components", [])}
        input_drivers = {}  # Track drivers per input pin
        
        for wire in blueprint.get("wires", []):
            from_parts = wire.get("from", "").split(":")
            to_parts = wire.get("to", "").split(":")
            
            if len(from_parts) != 2 or len(to_parts) != 2:
                errors.append(f"Invalid wire format: {wire}")
                continue
            
            from_label, from_pin = from_parts
            to_label, to_pin = to_parts
            
            # Check components exist
            if from_label not in labels:
                errors.append(f"Wire source component not found: {from_label}")
            if to_label not in labels:
                errors.append(f"Wire target component not found: {to_label}")
            
            # Check for multiple drivers
            to_key = f"{to_label}:{to_pin}"
            if to_key in input_drivers:
                errors.append(f"Output conflict: {to_key} has multiple drivers")
            input_drivers[to_key] = from_label
        
        if errors:
            return {"success": False, "errors": errors, "warnings": warnings}
        return {"success": True, "warnings": warnings, "blueprint": blueprint}
```

### 4. Updated LLM Service

```python
# app/services/llm_service.py (updated)

class LLMService:
    MAX_TOOL_CALLS = 10
    
    async def _call_with_tools(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> Dict[str, Any]:
        """Make LLM call with tool support"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        
        tool_calls_count = 0
        
        while tool_calls_count < self.MAX_TOOL_CALLS:
            response = await self._call_openai_with_tools(messages)
            
            # Check if LLM wants to call a tool
            if response.get("tool_calls"):
                for tool_call in response["tool_calls"]:
                    tool_name = tool_call["function"]["name"]
                    tool_args = json.loads(tool_call["function"]["arguments"])
                    
                    # Execute tool
                    tool_result = self.tool_handler.handle_tool_call(tool_name, tool_args)
                    
                    # Add tool result to messages
                    messages.append({
                        "role": "assistant",
                        "tool_calls": [tool_call]
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": json.dumps(tool_result)
                    })
                    
                    tool_calls_count += 1
            else:
                # LLM finished, return final response
                return response
        
        raise RuntimeError(f"Exceeded maximum tool calls ({self.MAX_TOOL_CALLS})")
```

## Data Models

### Tool Response Format

```typescript
interface ToolResponse {
    success: boolean;
    error?: string;
    hint?: string;
    warnings?: string[];
    // ... additional data fields
}

interface ComponentListResponse extends ToolResponse {
    categories: {
        [category: string]: {
            type: string;
            name: string;
            description: string;
        }[];
    };
}

interface ComponentSchemaResponse extends ToolResponse {
    component: {
        type: string;
        name: string;
        category: string;
        description: string;
        pins: { name: string; type: "input" | "output" }[];
        connection_rules: {
            [pinName: string]: {
                can_connect_to: string[];
                max_connections: number;
            };
        };
        example_connections: string[];
    };
}

interface ValidationResponse extends ToolResponse {
    errors?: string[];
    warnings?: string[];
    blueprint?: CircuitBlueprint;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Component API Completeness
*For any* request to `/api/components`, the response SHALL contain all component types defined in the registry, each with type, name, category, and description fields.
**Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2**

### Property 2: Component Schema Validity
*For any* valid component type, calling `get_component_schema` SHALL return a response containing pins array with name and type for each pin, and connection_rules object.
**Validates: Requirements 3.2, 9.1, 9.7**

### Property 3: Invalid Component Handling
*For any* invalid component type string, calling `get_component_schema` SHALL return success=false with an error message and hint containing similar valid types.
**Validates: Requirements 3.3**

### Property 4: Blueprint Validation - Error Detection
*For any* blueprint containing invalid component types, invalid pin names, or output-to-output connections, `validate_blueprint` SHALL return success=false with specific error messages.
**Validates: Requirements 4.2, 4.3, 9.2**

### Property 5: Blueprint Validation - Multiple Driver Detection
*For any* blueprint where multiple output pins connect to the same input pin, `validate_blueprint` SHALL return an error indicating the output conflict.
**Validates: Requirements 9.3, 9.4**

### Property 6: Blueprint Validation - Success Case
*For any* valid blueprint with correct component types, valid pin names, and proper connections, `validate_blueprint` SHALL return success=true with the validated blueprint.
**Validates: Requirements 4.4**

### Property 7: Tool Response Format Consistency
*For any* tool call, the response SHALL be a valid JSON object with a `success` boolean field, and if success=false, an `error` string field.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 8: Tool Call Limit Enforcement
*For any* LLM request, the service SHALL terminate after at most 10 tool calls, preventing infinite loops.
**Validates: Requirements 6.4**

### Property 9: Circuit State Completeness
*For any* call to `get_circuit_state`, the response SHALL include components array (with id, label, type, position), wires array (with connections), and simulation result if running.
**Validates: Requirements 5.2, 5.3**

## Error Handling

1. **Invalid Component Type**: Return error with fuzzy-matched suggestions
2. **Invalid Blueprint Structure**: Return detailed validation errors
3. **Tool Call Timeout**: Limit to 10 calls, then return partial result with warning
4. **API Errors**: Retry with exponential backoff, then return user-friendly error

## Testing Strategy

### Unit Tests
- Test each tool handler function with valid and invalid inputs
- Test component registry lookups
- Test blueprint validation logic

### Property-Based Tests
- Use Hypothesis to generate random blueprints and verify validation catches all errors
- Test that valid blueprints always pass validation
- Test tool response format consistency across all tools

### Integration Tests
- Test full LLM flow with tool calling
- Verify generated blueprints render correctly in playground
