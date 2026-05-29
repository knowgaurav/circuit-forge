"""Blueprint validation — the checks behind the ``validate_blueprint`` tool.

Why this module exists separately
---------------------------------
``validate_blueprint`` is by far the chunkiest tool: it walks every
component and wire in an LLM-proposed circuit and reports anything that would
stop the circuit from working. Pulling it out of the handler keeps both files
readable.

What it catches
---------------
* Empty blueprint (no components or no wires).
* Duplicate component labels.
* Unknown component types (with "did you mean…" suggestions).
* Wires in the wrong ``LABEL:PIN`` format.
* Wires referencing components or pins that don't exist.
* Two outputs driving the same input (output conflict).
* Output-to-output and input-to-input connections.
* Floating input pins on gates/output devices (every input must be driven).

Worked example
--------------
Blueprint with ``AND1`` (AND_2) and ``LED1`` (LED_RED), wired
``SW1:OUT -> AND1:A`` but leaving ``AND1:B`` unconnected:

    -> errors = ["Floating input: AND1 (AND_2) pin 'B' has no connection. ..."]
    -> returns {"success": False, "errors": [...], "warnings": [...]}

A fully-wired, valid blueprint returns ``{"success": True, ...}`` with the
component and wire counts.
"""

from typing import Any

from app.services.component_registry import ComponentRegistry

# Components that only *produce* signal — they have no input pins that need
# wiring, so we skip the floating-input check for them.
INPUT_TYPES = {
    "SWITCH_TOGGLE",
    "SWITCH_PUSH",
    "CLOCK",
    "CONST_HIGH",
    "CONST_LOW",
    "DIP_SWITCH_4",
    "NUMERIC_INPUT",
    "VCC_5V",
    "VCC_3V3",
}

# Components that only *consume* signal. Listed for documentation/clarity;
# their input pins are checked normally by the floating-input pass.
OUTPUT_TYPES = {
    "LED_RED",
    "LED_GREEN",
    "LED_YELLOW",
    "LED_BLUE",
    "DISPLAY_7SEG",
    "BUZZER",
    "MOTOR_DC",
    "PROBE",
    "GROUND",
}


def validate_blueprint(
    registry: ComponentRegistry, blueprint: dict[str, Any]
) -> dict[str, Any]:
    """Validate a circuit blueprint for completeness and correctness."""
    errors: list[str] = []
    warnings: list[str] = []

    components = blueprint.get("components", [])
    wires = blueprint.get("wires", [])

    if not components:
        errors.append("Blueprint has no components")
        return {"success": False, "errors": errors, "warnings": warnings}

    if not wires:
        errors.append("Blueprint has no wires - components must be connected")
        return {"success": False, "errors": errors, "warnings": warnings}

    labels = _index_components(registry, components, errors, warnings)
    input_drivers = _validate_wires(wires, labels, errors)
    _check_floating_inputs(labels, input_drivers, errors)

    if errors:
        return {
            "success": False,
            "errors": errors,
            "warnings": warnings,
            "hint": "Make sure every input pin on logic gates and output devices is connected to an output pin.",
        }

    return {
        "success": True,
        "warnings": warnings,
        "message": "Blueprint is valid and complete - all components are properly connected",
        "component_count": len(components),
        "wire_count": len(wires),
    }


def _index_components(
    registry: ComponentRegistry,
    components: list[dict[str, Any]],
    errors: list[str],
    warnings: list[str],
) -> dict[str, dict[str, Any]]:
    """Build a label -> {type, definition, position} map, recording errors.

    Flags duplicate labels, unknown component types (with suggestions), and
    negative positions (a warning, not an error).
    """
    labels: dict[str, dict[str, Any]] = {}
    for comp in components:
        label = comp.get("label", "")
        comp_type = comp.get("type", "")

        if label in labels:
            errors.append(f"Duplicate component label: {label}")
            continue

        comp_def = registry.get_component(comp_type)
        if not comp_def:
            similar = registry.search_components(comp_type)
            suggestions = [s.type for s in similar[:3]]
            hint = f" Did you mean: {', '.join(suggestions)}?" if suggestions else ""
            errors.append(f"Unknown component type: {comp_type}.{hint}")
            continue

        labels[label] = {
            "type": comp_type,
            "definition": comp_def,
            "position": comp.get("position", {}),
        }

        pos = comp.get("position", {})
        if pos.get("x", 0) < 0 or pos.get("y", 0) < 0:
            warnings.append(f"Component {label} has negative position")

    return labels


def _validate_wires(
    wires: list[dict[str, Any]],
    labels: dict[str, dict[str, Any]],
    errors: list[str],
) -> dict[str, str]:
    """Validate every wire and return the input-pin -> driver map.

    Checks endpoint format, that both components/pins exist, that no input is
    driven twice, and that no output-to-output or input-to-input links exist.
    """
    input_drivers: dict[str, str] = {}

    for wire in wires:
        from_str = wire.get("from", "")
        to_str = wire.get("to", "")

        from_parts = from_str.split(":")
        to_parts = to_str.split(":")

        if len(from_parts) != 2:
            errors.append(
                f"Invalid wire source format: {from_str} (expected 'LABEL:PIN')"
            )
            continue
        if len(to_parts) != 2:
            errors.append(
                f"Invalid wire target format: {to_str} (expected 'LABEL:PIN')"
            )
            continue

        from_label, from_pin = from_parts
        to_label, to_pin = to_parts

        if from_label not in labels:
            errors.append(f"Wire source component not found: {from_label}")
            continue
        if to_label not in labels:
            errors.append(f"Wire target component not found: {to_label}")
            continue

        from_comp = labels[from_label]
        from_def = from_comp.get("definition")
        if from_def:
            valid_pins = [p.name for p in from_def.pins]
            if from_pin not in valid_pins:
                errors.append(
                    f"Invalid pin '{from_pin}' on {from_label} ({from_comp['type']}). "
                    f"Valid pins: {', '.join(valid_pins)}"
                )

        to_comp = labels[to_label]
        to_def = to_comp.get("definition")
        if to_def:
            valid_pins = [p.name for p in to_def.pins]
            if to_pin not in valid_pins:
                errors.append(
                    f"Invalid pin '{to_pin}' on {to_label} ({to_comp['type']}). "
                    f"Valid pins: {', '.join(valid_pins)}"
                )

        # Two wires landing on the same input pin = output conflict.
        to_key = f"{to_label}:{to_pin}"
        if to_key in input_drivers:
            existing_driver = input_drivers[to_key]
            errors.append(
                f"Output conflict: {to_key} has multiple drivers "
                f"({existing_driver} and {from_str})"
            )
        else:
            input_drivers[to_key] = from_str

        # Direction sanity: outputs feed inputs, never output->output etc.
        if from_def and to_def:
            from_pin_def = next(
                (p for p in from_def.pins if p.name == from_pin), None
            )
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

    return input_drivers


def _check_floating_inputs(
    labels: dict[str, dict[str, Any]],
    input_drivers: dict[str, str],
    errors: list[str],
) -> None:
    """Flag every input pin (on non-source components) that nothing drives.

    A complete circuit must drive every input pin; a floating input means the
    gate/output device can never settle to a defined value.
    """
    for label, comp_info in labels.items():
        comp_def = comp_info.get("definition")
        comp_type = comp_info.get("type", "")

        if not comp_def:
            continue

        # Input devices have no input pins that need connecting.
        if comp_type in INPUT_TYPES:
            continue

        for pin in comp_def.pins:
            if pin.type == "input":
                pin_key = f"{label}:{pin.name}"
                if pin_key not in input_drivers:
                    errors.append(
                        f"Floating input: {label} ({comp_type}) pin '{pin.name}' has no connection. "
                        f"All input pins must be connected for the circuit to work."
                    )
