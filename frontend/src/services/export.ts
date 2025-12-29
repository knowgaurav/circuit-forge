/**
 * Circuit Export Service
 * Handles PNG and JSON export functionality
 */

import type { CircuitState, CircuitComponent, Wire, Annotation, StrokeData } from '@/types';

/**
 * Export circuit as PNG image
 */
export async function exportAsPng(
    components: CircuitComponent[],
    wires: Wire[],
    annotations: Annotation[],
    filename = 'circuit.png'
): Promise<void> {
    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    // Calculate bounds
    const bounds = calculateBounds(components, annotations);
    const padding = 50;

    canvas.width = bounds.width + padding * 2;
    canvas.height = bounds.height + padding * 2;

    // Fill background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Translate to account for bounds offset
    ctx.translate(padding - bounds.minX, padding - bounds.minY);

    // Draw wires
    wires.forEach(wire => drawWire(ctx, wire, components));

    // Draw components
    components.forEach(comp => drawComponent(ctx, comp));

    // Draw annotations
    annotations.forEach(ann => {
        if (ann.type === 'stroke') {
            drawStroke(ctx, ann.data as StrokeData);
        }
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

/**
 * Export circuit as JSON file
 */
export function exportAsJson(
    circuitState: CircuitState,
    filename = 'circuit.json'
): void {
    const json = JSON.stringify(circuitState, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Import circuit from JSON file
 */
export async function importFromJson(file: File): Promise<CircuitState> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);

                // Validate required fields
                if (!data.components || !Array.isArray(data.components)) {
                    throw new Error('Invalid circuit file: missing components');
                }
                if (!data.wires || !Array.isArray(data.wires)) {
                    throw new Error('Invalid circuit file: missing wires');
                }

                // Create circuit state
                const circuitState: CircuitState = {
                    sessionId: data.sessionId || '',
                    version: data.version || 0,
                    schemaVersion: data.schemaVersion || '1.0.0',
                    components: data.components,
                    wires: data.wires,
                    annotations: data.annotations || [],
                    updatedAt: data.updatedAt || new Date().toISOString(),
                };

                resolve(circuitState);
            } catch (error) {
                reject(new Error('Invalid circuit file'));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Helper functions

function calculateBounds(
    components: CircuitComponent[],
    annotations: Annotation[]
): { minX: number; minY: number; width: number; height: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Include components
    components.forEach(comp => {
        const width = 60;
        const height = 40;
        minX = Math.min(minX, comp.position.x - width / 2);
        minY = Math.min(minY, comp.position.y - height / 2);
        maxX = Math.max(maxX, comp.position.x + width / 2);
        maxY = Math.max(maxY, comp.position.y + height / 2);
    });

    // Include annotations
    annotations.forEach(ann => {
        if (ann.type === 'stroke') {
            const stroke = ann.data as StrokeData;
            stroke.points.forEach(point => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            });
        }
    });

    // Handle empty circuit
    if (minX === Infinity) {
        return { minX: 0, minY: 0, width: 400, height: 300 };
    }

    return {
        minX,
        minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gridSize = 20;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.5;

    for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function drawComponent(ctx: CanvasRenderingContext2D, component: CircuitComponent): void {
    const { position, type } = component;
    const width = 60;
    const height = 40;

    // Draw body
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(position.x - width / 2, position.y - height / 2, width, height, 4);
    ctx.fill();
    ctx.stroke();

    // Draw label
    ctx.fillStyle = '#374151';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = type.replace(/_/g, ' ').substring(0, 10);
    ctx.fillText(label, position.x, position.y);

    // Draw pins
    component.pins.forEach(pin => {
        const pinX = position.x + pin.position.x;
        const pinY = position.y + pin.position.y;
        ctx.fillStyle = pin.type === 'input' ? '#22C55E' : '#EF4444';
        ctx.beginPath();
        ctx.arc(pinX, pinY, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawWire(ctx: CanvasRenderingContext2D, wire: Wire, components: CircuitComponent[]): void {
    const fromComponent = components.find(c => c.id === wire.fromComponentId);
    const toComponent = components.find(c => c.id === wire.toComponentId);
    if (!fromComponent || !toComponent) return;

    const fromPin = fromComponent.pins.find(p => p.id === wire.fromPinId);
    const toPin = toComponent.pins.find(p => p.id === wire.toPinId);
    if (!fromPin || !toPin) return;

    const startX = fromComponent.position.x + fromPin.position.x;
    const startY = fromComponent.position.y + fromPin.position.y;
    const endX = toComponent.position.x + toPin.position.x;
    const endY = toComponent.position.y + toPin.position.y;

    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    if (wire.waypoints.length > 0) {
        wire.waypoints.forEach(wp => ctx.lineTo(wp.x, wp.y));
    }
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeData): void {
    if (stroke.points.length < 2) return;

    const firstPoint = stroke.points[0];
    if (!firstPoint) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(firstPoint.x, firstPoint.y);
    stroke.points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();
}
