"""API endpoints for component registry."""

from typing import Any

from fastapi import APIRouter, HTTPException

from app.services.component_registry import get_component_registry

router = APIRouter(prefix="/api/components", tags=["components"])


@router.get("")
async def get_all_components() -> dict[str, Any]:
    """Get all available components grouped by category."""
    registry = get_component_registry()
    components = registry.get_all_components()

    return {
        "categories": {
            category: [
                {
                    "type": c.type,
                    "name": c.name,
                    "description": c.description,
                    "category": c.category,
                }
                for c in comps
            ]
            for category, comps in components.items()
        },
        "total_count": len(registry.get_all_types()),
    }


@router.get("/{component_type}")
async def get_component_schema(component_type: str) -> dict[str, Any]:
    """Get detailed schema for a specific component type."""
    registry = get_component_registry()
    component = registry.get_component(component_type)

    if not component:
        # Find similar components for suggestions
        similar = registry.search_components(component_type)
        suggestions = [s.type for s in similar[:5]]

        raise HTTPException(
            status_code=404,
            detail={
                "error": f"Unknown component type: {component_type}",
                "suggestions": suggestions,
            },
        )

    return {
        "type": component.type,
        "name": component.name,
        "category": component.category,
        "description": component.description,
        "width": component.width,
        "height": component.height,
        "pins": [
            {
                "name": p.name,
                "type": p.type,
                "position": p.position,
            }
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
    }


@router.get("/categories/list")
async def get_categories() -> dict[str, list[str]]:
    """Get all component categories."""
    registry = get_component_registry()
    return {"categories": registry.get_categories()}
