/**
 * Blueprint Loader Service
 * Converts LLM-generated circuit blueprints into CircuitForge components and wires
 */

import type { CircuitBlueprint, CircuitComponent, Wire, ComponentType, Pin } from '@/types';
import { getComponentDefinition } from '@/constants/components';

interface LoadedCircuit {
    components: CircuitComponent[];
    wires: Wire[];
    errors: string[];
}

/**
 * Convert a circuit blueprint from LLM output into CircuitForge components and wires
 */
export function loadCircuitFromBlueprint(blueprint: CircuitBlueprint): LoadedCircuit {
    const errors: string[] = [];
    const components: CircuitComponent[] = [];
    const labelToComponent: Map<string, CircuitComponent> = new Map();

    // Step 1: Create all components
    for (const blueprintComp of blueprint.components) {
        const componentType = blueprintComp.type as ComponentType;
        const def = getComponentDefinition(componentType);

        if (!def) {
            errors.push(`Unknown component type: ${blueprintComp.type}`);
            continue;
        }

        // Create component with the specified label
        const componentId = `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const component: CircuitComponent = {
            id: componentId,
            type: componentType,
            label: blueprintComp.label,
            position: blueprintComp.position,
            rotation: 0,
            properties: blueprintComp.properties || {},
            pins: def.pins.map((pin, index): Pin => ({
                id: `${componentId}-pin-${index}`,
                name: pin.name,
                type: pin.type,
                position: pin.position,
            })),
        };

        components.push(component);
        labelToComponent.set(blueprintComp.label, component);
    }

    // Step 2: Create all wires
    const wires: Wire[] = [];

    for (const blueprintWire of blueprint.wires) {
        // Parse "LABEL:PIN" format
        const fromParts = blueprintWire.from.split(':');
        const toParts = blueprintWire.to.split(':');

        if (fromParts.length !== 2 || toParts.length !== 2) {
            errors.push(`Invalid wire format: ${blueprintWire.from} -> ${blueprintWire.to}. Expected "LABEL:PIN" format.`);
            continue;
        }

        const [fromLabel, fromPinName] = fromParts;
        const [toLabel, toPinName] = toParts;

        const fromComponent = labelToComponent.get(fromLabel!);
        const toComponent = labelToComponent.get(toLabel!);

        if (!fromComponent) {
            errors.push(`Wire source component not found: ${fromLabel}`);
            continue;
        }

        if (!toComponent) {
            errors.push(`Wire target component not found: ${toLabel}`);
            continue;
        }

        // Find pins by name
        const fromPin = fromComponent.pins.find(p => p.name === fromPinName || p.name === fromPinName?.toUpperCase());
        const toPin = toComponent.pins.find(p => p.name === toPinName || p.name === toPinName?.toUpperCase());

        if (!fromPin) {
            errors.push(`Pin "${fromPinName}" not found on component "${fromLabel}" (type: ${fromComponent.type}). Available pins: ${fromComponent.pins.map(p => p.name).join(', ')}`);
            continue;
        }

        if (!toPin) {
            errors.push(`Pin "${toPinName}" not found on component "${toLabel}" (type: ${toComponent.type}). Available pins: ${toComponent.pins.map(p => p.name).join(', ')}`);
            continue;
        }

        const wire: Wire = {
            id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fromComponentId: fromComponent.id,
            fromPinId: fromPin.id,
            toComponentId: toComponent.id,
            toPinId: toPin.id,
            waypoints: [],
        };

        wires.push(wire);
    }

    return { components, wires, errors };
}

/**
 * Validate a circuit blueprint before loading
 */
export function validateBlueprint(blueprint: CircuitBlueprint): string[] {
    const errors: string[] = [];

    if (!blueprint.components || !Array.isArray(blueprint.components)) {
        errors.push('Blueprint must have a components array');
        return errors;
    }

    if (!blueprint.wires || !Array.isArray(blueprint.wires)) {
        errors.push('Blueprint must have a wires array');
        return errors;
    }

    const labels = new Set<string>();

    for (const comp of blueprint.components) {
        if (!comp.type) {
            errors.push('Component missing type');
        }
        if (!comp.label) {
            errors.push('Component missing label');
        }
        if (!comp.position || typeof comp.position.x !== 'number' || typeof comp.position.y !== 'number') {
            errors.push(`Component "${comp.label}" has invalid position`);
        }
        if (labels.has(comp.label)) {
            errors.push(`Duplicate component label: ${comp.label}`);
        }
        labels.add(comp.label);

        // Check if component type exists
        const def = getComponentDefinition(comp.type as ComponentType);
        if (!def) {
            errors.push(`Unknown component type: ${comp.type}`);
        }
    }

    for (const wire of blueprint.wires) {
        if (!wire.from || !wire.to) {
            errors.push('Wire missing from or to specification');
        }
        if (wire.from && !wire.from.includes(':')) {
            errors.push(`Invalid wire from format: ${wire.from}. Expected "LABEL:PIN"`);
        }
        if (wire.to && !wire.to.includes(':')) {
            errors.push(`Invalid wire to format: ${wire.to}. Expected "LABEL:PIN"`);
        }
    }

    return errors;
}
