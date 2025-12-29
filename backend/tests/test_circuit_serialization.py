"""Property-based tests for circuit state serialization.

**Feature: circuit-forge, Property 9: Circuit State Serialization Round-Trip**
**Validates: Requirements 14.1, 14.2, 14.3**

For any valid circuit state, serializing to JSON and then deserializing
SHALL produce a circuit state that is equivalent to the original.
"""

from datetime import datetime
from typing import Any

from hypothesis import given, settings, strategies as st

from app.models.circuit import (
    Annotation,
    CircuitComponent,
    CircuitState,
    ComponentType,
    Pin,
    PinType,
    Position,
    Rotation,
    StrokeData,
    StrokeWidth,
    TextData,
    Wire,
)


# ============================================================================
# Hypothesis Strategies for generating valid circuit data
# ============================================================================

# Strategy for generating valid positions
position_strategy = st.builds(
    Position,
    x=st.floats(min_value=-10000, max_value=10000, allow_nan=False, allow_infinity=False),
    y=st.floats(min_value=-10000, max_value=10000, allow_nan=False, allow_infinity=False),
)

# Strategy for generating valid pin types
pin_type_strategy = st.sampled_from([PinType.INPUT, PinType.OUTPUT])

# Strategy for generating valid pins
pin_strategy = st.builds(
    Pin,
    id=st.text(min_size=1, max_size=36, alphabet=st.characters(whitelist_categories=("L", "N"))),
    name=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("L", "N"))),
    type=pin_type_strategy,
    position=position_strategy,
)

# Strategy for generating valid component types
component_type_strategy = st.sampled_from(list(ComponentType))

# Strategy for generating valid rotations
rotation_strategy = st.sampled_from(list(Rotation))

# Strategy for generating valid component properties
properties_strategy = st.dictionaries(
    keys=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("L",))),
    values=st.one_of(
        st.integers(min_value=-1000, max_value=1000),
        st.floats(min_value=-1000, max_value=1000, allow_nan=False, allow_infinity=False),
        st.booleans(),
        st.text(min_size=0, max_size=50),
    ),
    max_size=5,
)


# Strategy for generating valid circuit components
circuit_component_strategy = st.builds(
    CircuitComponent,
    id=st.uuids().map(str),
    type=component_type_strategy,
    position=position_strategy,
    rotation=rotation_strategy,
    properties=properties_strategy,
    pins=st.lists(pin_strategy, min_size=0, max_size=8),
)

# Strategy for generating valid wires (requires component IDs)
def wire_strategy_for_components(component_ids: list[str]) -> st.SearchStrategy[Wire]:
    """Generate wires that reference existing component IDs."""
    if len(component_ids) < 2:
        return st.just(None)  # type: ignore
    
    return st.builds(
        Wire,
        id=st.uuids().map(str),
        fromComponentId=st.sampled_from(component_ids),
        fromPinId=st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=("L", "N"))),
        toComponentId=st.sampled_from(component_ids),
        toPinId=st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=("L", "N"))),
        waypoints=st.lists(position_strategy, min_size=0, max_size=10),
    )

# Strategy for stroke widths
stroke_width_strategy = st.sampled_from(list(StrokeWidth))

# Strategy for annotation colors (8 colors from requirements)
annotation_color_strategy = st.sampled_from([
    "#000000",  # black
    "#EF4444",  # red
    "#3B82F6",  # blue
    "#22C55E",  # green
    "#F97316",  # orange
    "#A855F7",  # purple
    "#92400E",  # brown
    "#FFFFFF",  # white
])

# Strategy for stroke data
stroke_data_strategy = st.builds(
    StrokeData,
    points=st.lists(position_strategy, min_size=2, max_size=100),
    color=annotation_color_strategy,
    width=stroke_width_strategy,
)

# Strategy for text data
text_data_strategy = st.builds(
    TextData,
    content=st.text(min_size=1, max_size=200),
    position=position_strategy,
    fontSize=st.floats(min_value=8, max_value=72, allow_nan=False, allow_infinity=False),
)

# Strategy for annotations
annotation_strategy = st.one_of(
    st.builds(
        Annotation,
        id=st.uuids().map(str),
        type=st.just("stroke"),
        userId=st.uuids().map(str),
        data=stroke_data_strategy,
    ),
    st.builds(
        Annotation,
        id=st.uuids().map(str),
        type=st.just("text"),
        userId=st.uuids().map(str),
        data=text_data_strategy,
    ),
)

# Strategy for valid session IDs (6-char uppercase alphanumeric)
session_id_strategy = st.text(
    min_size=6,
    max_size=6,
    alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
)

# Strategy for schema versions (semver format)
schema_version_strategy = st.builds(
    lambda major, minor, patch: f"{major}.{minor}.{patch}",
    major=st.integers(min_value=0, max_value=99),
    minor=st.integers(min_value=0, max_value=99),
    patch=st.integers(min_value=0, max_value=99),
)



# ============================================================================
# Property-Based Tests
# ============================================================================

@given(
    session_id=session_id_strategy,
    version=st.integers(min_value=0, max_value=10000),
    schema_version=schema_version_strategy,
    components=st.lists(circuit_component_strategy, min_size=0, max_size=20),
    annotations=st.lists(annotation_strategy, min_size=0, max_size=10),
)
@settings(max_examples=100)
def test_circuit_state_serialization_round_trip(
    session_id: str,
    version: int,
    schema_version: str,
    components: list[CircuitComponent],
    annotations: list[Annotation],
) -> None:
    """
    **Feature: circuit-forge, Property 9: Circuit State Serialization Round-Trip**
    **Validates: Requirements 14.1, 14.2, 14.3**
    
    For any valid circuit state, serializing to JSON and then deserializing
    SHALL produce a circuit state that is equivalent to the original.
    """
    # Get component IDs for wire generation
    component_ids = [c.id for c in components]
    
    # Generate wires that reference existing components
    wires: list[Wire] = []
    if len(component_ids) >= 2:
        # Create a few wires between components
        for i in range(min(3, len(component_ids) - 1)):
            wire = Wire(
                id=f"wire-{i}",
                fromComponentId=component_ids[i],
                fromPinId=f"out-{i}",
                toComponentId=component_ids[(i + 1) % len(component_ids)],
                toPinId=f"in-{i}",
                waypoints=[],
            )
            wires.append(wire)
    
    # Create the original circuit state
    original = CircuitState(
        sessionId=session_id,
        version=version,
        schemaVersion=schema_version,
        components=components,
        wires=wires,
        annotations=annotations,
        updatedAt=datetime.utcnow(),
    )
    
    # Serialize to JSON (using model_dump with by_alias for camelCase)
    json_data = original.model_dump(mode="json", by_alias=True)
    
    # Deserialize back to CircuitState
    deserialized = CircuitState.model_validate(json_data)
    
    # Verify equivalence (excluding updatedAt which may have microsecond differences)
    assert deserialized.session_id == original.session_id
    assert deserialized.version == original.version
    assert deserialized.schema_version == original.schema_version
    assert len(deserialized.components) == len(original.components)
    assert len(deserialized.wires) == len(original.wires)
    assert len(deserialized.annotations) == len(original.annotations)
    
    # Verify components
    for orig_comp, deser_comp in zip(original.components, deserialized.components):
        assert deser_comp.id == orig_comp.id
        assert deser_comp.type == orig_comp.type
        assert deser_comp.position.x == orig_comp.position.x
        assert deser_comp.position.y == orig_comp.position.y
        assert deser_comp.rotation == orig_comp.rotation
        assert deser_comp.properties == orig_comp.properties
        assert len(deser_comp.pins) == len(orig_comp.pins)
    
    # Verify wires
    for orig_wire, deser_wire in zip(original.wires, deserialized.wires):
        assert deser_wire.id == orig_wire.id
        assert deser_wire.from_component_id == orig_wire.from_component_id
        assert deser_wire.from_pin_id == orig_wire.from_pin_id
        assert deser_wire.to_component_id == orig_wire.to_component_id
        assert deser_wire.to_pin_id == orig_wire.to_pin_id
        assert len(deser_wire.waypoints) == len(orig_wire.waypoints)


@given(
    components=st.lists(circuit_component_strategy, min_size=1, max_size=5),
)
@settings(max_examples=100)
def test_component_serialization_round_trip(
    components: list[CircuitComponent],
) -> None:
    """
    Test that individual components serialize and deserialize correctly.
    """
    for original in components:
        # Serialize
        json_data = original.model_dump(mode="json", by_alias=True)
        
        # Deserialize
        deserialized = CircuitComponent.model_validate(json_data)
        
        # Verify
        assert deserialized.id == original.id
        assert deserialized.type == original.type
        assert deserialized.position.x == original.position.x
        assert deserialized.position.y == original.position.y
        assert deserialized.rotation == original.rotation


@given(annotations=st.lists(annotation_strategy, min_size=1, max_size=5))
@settings(max_examples=100)
def test_annotation_serialization_round_trip(
    annotations: list[Annotation],
) -> None:
    """
    Test that annotations serialize and deserialize correctly.
    """
    for original in annotations:
        # Serialize
        json_data = original.model_dump(mode="json", by_alias=True)
        
        # Deserialize
        deserialized = Annotation.model_validate(json_data)
        
        # Verify
        assert deserialized.id == original.id
        assert deserialized.type == original.type
        assert deserialized.user_id == original.user_id
