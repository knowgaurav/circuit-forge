"""
The registry that wraps every component definition.

``ComponentRegistry`` is a thin lookup layer over the flat list of
``ComponentDefinition`` objects assembled in ``components/__init__.py``. It
gives callers four convenient views of the same underlying data:

- by type: ``get_component("AND_2")`` returns one definition.
- by category: ``get_all_components()`` returns ``{category: [comps...]}``.
- by free-text query: ``search_components("led")`` matches type, name, or
  description.
- helpers like ``get_all_types``, ``get_categories`` and ``get_pin_names``
  cover the small number of metadata questions callers actually ask.

A module-level singleton is exposed via ``get_component_registry()``. The
registry is read-only after construction, so a singleton is the simplest fit;
tests that want isolation can build their own ``ComponentRegistry()``.
"""

from app.services.component_registry.components import COMPONENT_DEFINITIONS
from app.services.component_registry.types import ComponentDefinition


class ComponentRegistry:
    """Registry for all circuit components."""

    def __init__(self):
        self._components: dict[str, ComponentDefinition] = {
            comp.type: comp for comp in COMPONENT_DEFINITIONS
        }
        self._categories: dict[str, list[ComponentDefinition]] = {}
        for comp in COMPONENT_DEFINITIONS:
            if comp.category not in self._categories:
                self._categories[comp.category] = []
            self._categories[comp.category].append(comp)

    def get_all_components(self) -> dict[str, list[ComponentDefinition]]:
        """Return all components grouped by category."""
        return self._categories

    def get_component(self, comp_type: str) -> ComponentDefinition | None:
        """Get a component by type."""
        return self._components.get(comp_type)

    def get_categories(self) -> list[str]:
        """Get all category names."""
        return list(self._categories.keys())

    def search_components(self, query: str) -> list[ComponentDefinition]:
        """Search components by type or name (fuzzy match)."""
        query_lower = query.lower()
        results = []
        for comp in COMPONENT_DEFINITIONS:
            if (
                query_lower in comp.type.lower()
                or query_lower in comp.name.lower()
                or query_lower in comp.description.lower()
            ):
                results.append(comp)
        return results

    def get_all_types(self) -> list[str]:
        """Get all component types."""
        return list(self._components.keys())

    def get_pin_names(self, comp_type: str) -> list[str]:
        """Get all pin names for a component type."""
        comp = self.get_component(comp_type)
        if not comp:
            return []
        return [pin.name for pin in comp.pins]


# Singleton instance
_registry: ComponentRegistry | None = None


def get_component_registry() -> ComponentRegistry:
    """Get the singleton component registry instance."""
    global _registry
    if _registry is None:
        _registry = ComponentRegistry()
    return _registry
