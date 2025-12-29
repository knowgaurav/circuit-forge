"""Property-based tests for schema version inclusion.

**Feature: circuit-forge, Property 10: Schema Version Inclusion**
**Validates: Requirements 14.4**

For any serialized circuit state JSON, the output SHALL contain a schemaVersion
field with a valid semantic version string.
"""

import re
from datetime import datetime

from hypothesis import given, settings, strategies as st

from app.models.circuit import (
    CircuitComponent,
    CircuitState,
    ComponentType,
    Position,
    Rotation,
    SCHEMA_VERSION,
)


# Semver regex pattern
SEMVER_PATTERN = re.compile(r"^\d+\.\d+\.\d+$")


# Strategy for valid session IDs (6-char uppercase alphanumeric)
session_id_strategy = st.text(
    min_size=6,
    max_size=6,
    alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
)

# Strategy for generating valid positions
position_strategy = st.builds(
    Position,
    x=st.floats(min_value=-10000, max_value=10000, allow_nan=False, allow_infinity=False),
    y=st.floats(min_value=-10000, max_value=10000, allow_nan=False, allow_infinity=False),
)

# Strategy for generating valid component types
component_type_strategy = st.sampled_from(list(ComponentType))

# Strategy for generating valid rotations
rotation_strategy = st.sampled_from(list(Rotation))

# Strategy for generating valid circuit components
circuit_component_strategy = st.builds(
    CircuitComponent,
    id=st.uuids().map(str),
    type=component_type_strategy,
    position=position_strategy,
    rotation=rotation_strategy,
    properties=st.just({}),
    pins=st.just([]),
)


@given(
    session_id=session_id_strategy,
    version=st.integers(min_value=0, max_value=10000),
    components=st.lists(circuit_component_strategy, min_size=0, max_size=10),
)
@settings(max_examples=100)
def test_schema_version_inclusion(
    session_id: str,
    version: int,
    components: list[CircuitComponent],
) -> None:
    """
    **Feature: circuit-forge, Property 10: Schema Version Inclusion**
    **Validates: Requirements 14.4**
    
    For any serialized circuit state JSON, the output SHALL contain a
    schemaVersion field with a valid semantic version string.
    """
    # Create circuit state
    circuit_state = CircuitState(
        sessionId=session_id,
        version=version,
        schemaVersion=SCHEMA_VERSION,
        components=components,
        wires=[],
        annotations=[],
        updatedAt=datetime.utcnow(),
    )
    
    # Serialize to JSON
    json_data = circuit_state.model_dump(mode="json", by_alias=True)
    
    # Verify schemaVersion field exists
    assert "schemaVersion" in json_data, "schemaVersion field must be present in serialized JSON"
    
    # Verify schemaVersion is a valid semver string
    schema_version = json_data["schemaVersion"]
    assert isinstance(schema_version, str), "schemaVersion must be a string"
    assert SEMVER_PATTERN.match(schema_version), f"schemaVersion '{schema_version}' must match semver format (X.Y.Z)"


@given(session_id=session_id_strategy)
@settings(max_examples=100)
def test_empty_circuit_has_schema_version(session_id: str) -> None:
    """
    Test that even empty circuits have a valid schema version.
    """
    # Create empty circuit state using factory method
    circuit_state = CircuitState.create_empty(session_id)
    
    # Serialize to JSON
    json_data = circuit_state.model_dump(mode="json", by_alias=True)
    
    # Verify schemaVersion field exists and is valid
    assert "schemaVersion" in json_data
    assert SEMVER_PATTERN.match(json_data["schemaVersion"])
    assert json_data["schemaVersion"] == SCHEMA_VERSION


@given(
    session_id=session_id_strategy,
    custom_version=st.from_regex(r"^\d{1,2}\.\d{1,2}\.\d{1,2}$", fullmatch=True),
)
@settings(max_examples=100)
def test_custom_schema_version_preserved(session_id: str, custom_version: str) -> None:
    """
    Test that custom schema versions are preserved through serialization.
    """
    # Create circuit state with custom schema version
    circuit_state = CircuitState(
        sessionId=session_id,
        version=0,
        schemaVersion=custom_version,
        components=[],
        wires=[],
        annotations=[],
        updatedAt=datetime.utcnow(),
    )
    
    # Serialize and deserialize
    json_data = circuit_state.model_dump(mode="json", by_alias=True)
    deserialized = CircuitState.model_validate(json_data)
    
    # Verify schema version is preserved
    assert deserialized.schema_version == custom_version
    assert json_data["schemaVersion"] == custom_version
