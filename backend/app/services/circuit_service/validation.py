"""Wire validation rules.

Why this module exists separately
---------------------------------
Adding a wire is the only circuit operation with non-trivial validation:
the wire must connect a real output pin to a real, free input pin. The
checks themselves are pure (just look at the current state and the wire),
so they live here in a single function rather than mixed into the async
service code.

Rules enforced (in order)
-------------------------
1. The exact same connection (from/to component+pin) must not already exist.
2. The target input pin must not already be wired to *something else*.
3. The source component, source pin, target component, and target pin must
   all exist in ``state``.
4. The source pin must be an OUTPUT and the target pin must be an INPUT.
"""

from app.exceptions.base import ValidationException
from app.models.circuit import CircuitState, PinType, Wire


def validate_wire_connection(state: CircuitState, wire: Wire) -> None:
    """Raise :class:`ValidationException` if ``wire`` cannot be added to ``state``."""
    for existing_wire in state.wires:
        if (
            existing_wire.from_component_id == wire.from_component_id
            and existing_wire.from_pin_id == wire.from_pin_id
            and existing_wire.to_component_id == wire.to_component_id
            and existing_wire.to_pin_id == wire.to_pin_id
        ):
            raise ValidationException(
                message="This wire connection already exists",
                code="DUPLICATE_WIRE",
            )

    for existing_wire in state.wires:
        if (
            existing_wire.to_component_id == wire.to_component_id
            and existing_wire.to_pin_id == wire.to_pin_id
        ):
            raise ValidationException(
                message="This input pin already has a connection",
                code="INPUT_ALREADY_CONNECTED",
            )

    from_component = next(
        (c for c in state.components if c.id == wire.from_component_id), None
    )
    if from_component is None:
        raise ValidationException(
            message=f"Source component '{wire.from_component_id}' not found",
            code="INVALID_WIRE",
        )

    from_pin = next(
        (p for p in from_component.pins if p.id == wire.from_pin_id), None
    )
    if from_pin is None:
        raise ValidationException(
            message=f"Source pin '{wire.from_pin_id}' not found",
            code="INVALID_WIRE",
        )

    to_component = next(
        (c for c in state.components if c.id == wire.to_component_id), None
    )
    if to_component is None:
        raise ValidationException(
            message=f"Target component '{wire.to_component_id}' not found",
            code="INVALID_WIRE",
        )

    to_pin = next((p for p in to_component.pins if p.id == wire.to_pin_id), None)
    if to_pin is None:
        raise ValidationException(
            message=f"Target pin '{wire.to_pin_id}' not found",
            code="INVALID_WIRE",
        )

    if from_pin.type != PinType.OUTPUT:
        raise ValidationException(
            message="Wire must start from an output pin",
            code="INVALID_WIRE_DIRECTION",
        )

    if to_pin.type != PinType.INPUT:
        raise ValidationException(
            message="Wire must end at an input pin",
            code="INVALID_WIRE_DIRECTION",
        )
