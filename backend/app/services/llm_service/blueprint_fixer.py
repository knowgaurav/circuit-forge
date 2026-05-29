"""Best-effort auto-repair of an LLM-generated circuit blueprint.

Why this module exists separately
---------------------------------
When the fallback path produces a blueprint that fails validation, we make
one automated attempt to fix the common, mechanical problems before giving
up. This logic is self-contained (it only reads the blueprint and the list of
error strings), so it lives in its own small module as a mixin.

What it fixes
-------------
1. **Invalid-pin wires** and **multiple-driver wires** — removed outright,
   since we can't know the model's intent.
2. **Floating inputs** — for each ``"Floating input: LABEL (TYPE) pin 'PIN'"``
   error, it adds a ``CONST_LOW`` component near the offending component and
   wires it into the floating pin, so the circuit becomes complete.

Example
-------
Errors include ``"Floating input: AND1 (AND_2) pin 'B' has no connection..."``:

    -> a new ``CONST_LOW`` labelled ``GND1`` is placed just left of AND1
    -> a wire ``GND1:OUT -> AND1:B`` is appended

The caller re-validates afterward; this function only attempts the fix.
"""

import re as regex
from typing import Any

from app.core.logger import get_logger

logger = get_logger()


class BlueprintFixerMixin:
    """Auto-fix common blueprint errors. No host-class dependencies."""

    def _auto_fix_blueprint(self, blueprint: dict[str, Any], errors: list[str]) -> dict[str, Any]:
        """Attempt to automatically fix common blueprint errors."""
        fixed = {
            "components": list(blueprint.get("components", [])),
            "wires": list(blueprint.get("wires", []))
        }

        # Track wires to remove
        wires_to_remove = []

        for i, wire in enumerate(fixed["wires"]):
            from_str = wire.get("from", "")
            to_str = wire.get("to", "")

            for error in errors:
                if "Invalid pin" in error and (from_str in error or to_str in error):
                    logger.info(f"Removing wire with invalid pin: {from_str} -> {to_str}")
                    wires_to_remove.append(i)
                    break

                if "multiple drivers" in error and to_str in error:
                    logger.info(f"Removing wire causing multiple drivers: {from_str} -> {to_str}")
                    wires_to_remove.append(i)
                    break

        # Remove problematic wires (in reverse to maintain indices)
        for i in sorted(wires_to_remove, reverse=True):
            fixed["wires"].pop(i)

        # Fix floating inputs by adding CONST_LOW components
        floating_inputs = []
        for error in errors:
            if "Floating input:" in error:
                # Extract component label and pin from error message
                # Format: "Floating input: LABEL (TYPE) pin 'PIN' has no connection..."
                match = regex.search(r"Floating input: (\w+) \([^)]+\) pin '(\w+)'", error)
                if match:
                    label, pin = match.groups()
                    floating_inputs.append((label, pin))

        # Add CONST_LOW for each floating input
        const_count = sum(1 for c in fixed["components"] if c.get("type") == "CONST_LOW")
        for i, (label, pin) in enumerate(floating_inputs):
            const_label = f"GND{const_count + i + 1}"
            # Find the component position to place CONST_LOW nearby
            comp = next((c for c in fixed["components"] if c.get("label") == label), None)
            if comp:
                pos = comp.get("position", {"x": 100, "y": 100})
                # Add CONST_LOW component
                fixed["components"].append({
                    "type": "CONST_LOW",
                    "label": const_label,
                    "position": {"x": pos["x"] - 80, "y": pos["y"]},
                    "properties": {}
                })
                # Add wire from CONST_LOW to floating input
                fixed["wires"].append({
                    "from": f"{const_label}:OUT",
                    "to": f"{label}:{pin}"
                })
                logger.info(f"Auto-fixed floating input {label}:{pin} with {const_label}")

        return fixed
