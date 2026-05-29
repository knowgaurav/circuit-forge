"""Validate a learner's circuit against a level's requirements.

Why this module exists separately
---------------------------------
This is the "did the student build the right thing?" check. It compares the
circuit the learner submitted against the ``validation_criteria`` attached to
the level's practical content, and reports what's missing in plain language.

What it checks
--------------
* **Required components** — for each ``(type, min_count)`` rule, count how
  many of that type are present; if fewer than required, report the gap.
* **Required connections** — for each ``from_spec -> to_spec`` rule, look for
  a wire whose endpoints' component *types* match. (This is a deliberately
  simple type-level match, not a pin-exact one.)

Worked example
--------------
Criteria: needs 1x AND_2, and a connection ``SWITCH_TOGGLE -> AND_2``.
The learner placed an AND_2 but wired nothing to it:

    missing_components  = []
    missing_connections = ["SWITCH_TOGGLE:... -> AND_2:..."]
    is_valid            = False
    feedback            = "Missing connections: SWITCH_TOGGLE:... -> AND_2:..."

When nothing is missing, ``is_valid`` is True and the feedback is a
congratulatory message.
"""

from typing import Any

from app.models.course import ValidationResult


class ValidationMixin:
    """Circuit-against-level validation.

    Relies on the host class providing ``self.level_content_repo``.
    """

    async def validate_circuit(
        self,
        course_plan_id: str,
        level_number: int,
        circuit_state: dict[str, Any],
    ) -> ValidationResult:
        """Validate a circuit against level requirements."""
        # Get level content with validation criteria
        content = await self.level_content_repo.get_by_course_and_level(
            course_plan_id, level_number
        )

        if not content or not content.practical:
            return ValidationResult(
                isValid=False,
                missingComponents=[],
                missingConnections=[],
                feedback="Level content not available",
            )

        criteria = content.practical.validation_criteria
        components = circuit_state.get("components", [])
        wires = circuit_state.get("wires", [])

        missing_components: list[str] = []
        missing_connections: list[str] = []

        # Check required components
        for req in criteria.required_components:
            count = sum(1 for c in components if c.get("type") == req.type)
            if count < req.min_count:
                missing_components.append(
                    f"{req.type} (need {req.min_count}, have {count})"
                )

        # Check required connections (simplified check)
        for req in criteria.required_connections:
            # This is a simplified check - in production you'd want more sophisticated matching
            found = False
            for wire in wires:
                # Check if wire connects the required component types
                from_type = req.from_spec.split(":")[0]
                to_type = req.to_spec.split(":")[0]

                from_component = next(
                    (c for c in components if c.get("id") == wire.get("fromComponentId")),
                    None,
                )
                to_component = next(
                    (c for c in components if c.get("id") == wire.get("toComponentId")),
                    None,
                )

                if (from_component and to_component and
                    from_component.get("type") == from_type and
                    to_component.get("type") == to_type):
                    found = True
                    break

            if not found:
                missing_connections.append(f"{req.from_spec} -> {req.to_spec}")

        is_valid = len(missing_components) == 0 and len(missing_connections) == 0

        if is_valid:
            feedback = "Great job! Your circuit meets all requirements."
        else:
            feedback_parts = []
            if missing_components:
                feedback_parts.append(f"Missing components: {', '.join(missing_components)}")
            if missing_connections:
                feedback_parts.append(f"Missing connections: {', '.join(missing_connections)}")
            feedback = " ".join(feedback_parts)

        return ValidationResult(
            isValid=is_valid,
            missingComponents=missing_components,
            missingConnections=missing_connections,
            feedback=feedback,
        )
