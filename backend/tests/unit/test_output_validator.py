"""Unit tests for ``OutputValidator`` registry-aware checks (Story B — B.10).

These cover the two new methods only:

* ``validate_component_against_registry`` — rejects unknown component types.
* ``validate_pin_names_against_registry`` — rejects any pin name that isn't
  on the registry definition for the given component type.

CB.D regression: an LLM output that names ``OUTPUT`` as a pin on ``AND_2``
(real pin is ``Y``) must be caught by the validator before the orchestrator
hands it to ``add_wire``.
"""

from __future__ import annotations

import pytest

from app.services.component_registry import ComponentRegistry
from app.services.output_validator import OutputValidator, ValidationCheck


@pytest.fixture
def validator() -> OutputValidator:
    return OutputValidator(registry=ComponentRegistry())


class TestValidateComponentAgainstRegistry:
    def test_valid_component_returns_ok(self, validator: OutputValidator) -> None:
        result = validator.validate_component_against_registry("AND_2")
        assert isinstance(result, ValidationCheck)
        assert result.is_valid is True
        assert result.error_code is None

    def test_unknown_component_returns_invalid(
        self, validator: OutputValidator
    ) -> None:
        result = validator.validate_component_against_registry("NOPE")
        assert result.is_valid is False
        assert result.error_code == "INVALID_COMPONENT_TYPE"
        assert result.details is not None

    def test_raises_when_registry_not_configured(self) -> None:
        bare = OutputValidator()
        with pytest.raises(RuntimeError, match="registry not configured"):
            bare.validate_component_against_registry("AND_2")


class TestValidatePinNamesAgainstRegistry:
    def test_valid_pins_return_ok(self, validator: OutputValidator) -> None:
        result = validator.validate_pin_names_against_registry(
            "AND_2", ["A", "B", "Y"]
        )
        assert result.is_valid is True
        assert result.error_code is None

    def test_bogus_pin_returns_invalid(self, validator: OutputValidator) -> None:
        result = validator.validate_pin_names_against_registry(
            "AND_2", ["A", "BOGUS"]
        )
        assert result.is_valid is False
        assert result.error_code == "INVALID_PIN_NAME"

    def test_cb_d_regression_output_pin_on_and_gate(
        self, validator: OutputValidator
    ) -> None:
        """CB.D: an LLM emitting ``OUTPUT`` for AND_2's output pin (real
        name is ``Y``) must be rejected before it hits the canvas."""
        result = validator.validate_pin_names_against_registry(
            "AND_2", ["OUTPUT"]
        )
        assert result.is_valid is False
        assert result.error_code == "INVALID_PIN_NAME"
        assert "OUTPUT" in (result.details or "")

    def test_raises_when_registry_not_configured(self) -> None:
        bare = OutputValidator()
        with pytest.raises(RuntimeError, match="registry not configured"):
            bare.validate_pin_names_against_registry("AND_2", ["Y"])
