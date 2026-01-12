/**
 * @file WireRenderer.ts
 * @description Pure functions for drawing wires with orthogonal routing
 * @module features/canvas/renderers
 */

import type { Position, Wire, CircuitComponent } from '@/types';
import type { SignalState } from '@/services/simulation';
import { getWireStyle } from '@/components/circuit/SimulationOverlay';

/**
 * Draws a wire between two components with orthogonal routing.
 */
export function drawWire(
    ctx: CanvasRenderingContext2D,
    wire: Wire,
    components: CircuitComponent[],
    signalState?: SignalState
): void {
    const fromComponent = components.find((c) => c.id === wire.fromComponentId);
    const toComponent = components.find((c) => c.id === wire.toComponentId);
    if (!fromComponent || !toComponent) return;

    const fromPin = fromComponent.pins.find((p) => p.id === wire.fromPinId);
    const toPin = toComponent.pins.find((p) => p.id === wire.toPinId);
    if (!fromPin || !toPin) return;

    const startX = fromComponent.position.x + fromPin.position.x;
    const startY = fromComponent.position.y + fromPin.position.y;
    const endX = toComponent.position.x + toPin.position.x;
    const endY = toComponent.position.y + toPin.position.y;

    // Calculate orthogonal routing path
    const gridSize = 20;
    const path = calculateOrthogonalPath(startX, startY, endX, endY, gridSize);

    // Determine wire color and style based on signal state
    let wireColor = '#6B7280';
    let wireWidth = 2.5;
    let glowColor = '';

    if (signalState) {
        const style = getWireStyle(signalState);
        wireColor = style.color;
        wireWidth = 3;
        if (signalState === 'HIGH') {
            glowColor = '#22C55E';
        } else if (signalState === 'ERROR' || signalState === 'UNDEFINED') {
            glowColor = '#EF4444';
        }
        if (style.dashed) {
            ctx.setLineDash([6, 4]);
        } else {
            ctx.setLineDash([]);
        }
    }

    // Draw glow effect for active wires
    if (glowColor) {
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = wireWidth + 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.3;

        ctx.beginPath();
        if (path.length > 0 && path[0]) {
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                const point = path[i];
                if (point) ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Draw main wire
    ctx.strokeStyle = wireColor;
    ctx.lineWidth = wireWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (path.length > 0 && path[0]) {
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            const point = path[i];
            if (point) ctx.lineTo(point.x, point.y);
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw connection dots at endpoints with gradient
    const dotGradient = ctx.createRadialGradient(startX, startY, 0, startX, startY, 4);
    dotGradient.addColorStop(0, wireColor);
    dotGradient.addColorStop(1, wireColor + '80');

    ctx.fillStyle = dotGradient;
    ctx.beginPath();
    ctx.arc(startX, startY, 4, 0, Math.PI * 2);
    ctx.fill();

    const dotGradient2 = ctx.createRadialGradient(endX, endY, 0, endX, endY, 4);
    dotGradient2.addColorStop(0, wireColor);
    dotGradient2.addColorStop(1, wireColor + '80');

    ctx.fillStyle = dotGradient2;
    ctx.beginPath();
    ctx.arc(endX, endY, 4, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Calculates an orthogonal (right-angle) path between two points.
 */
export function calculateOrthogonalPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    gridSize: number
): Position[] {
    const path: Position[] = [];

    // Snap to grid
    const snapToGrid = (val: number) => Math.round(val / gridSize) * gridSize;

    path.push({ x: startX, y: startY });

    const dx = endX - startX;
    const dy = endY - startY;

    // Determine routing strategy based on relative positions
    if (Math.abs(dx) < gridSize && Math.abs(dy) < gridSize) {
        // Very close, direct connection
        path.push({ x: endX, y: endY });
    } else if (dx > 0) {
        // End is to the right of start (normal case for output -> input)
        const midX = snapToGrid(startX + dx / 2);

        if (Math.abs(dy) < gridSize) {
            // Nearly horizontal - go straight with small jog
            path.push({ x: midX, y: startY });
            path.push({ x: midX, y: endY });
        } else {
            // Need vertical routing
            const exitX = startX + Math.min(gridSize * 2, dx / 3);
            path.push({ x: exitX, y: startY });
            path.push({ x: exitX, y: snapToGrid(startY + dy / 2) });
            const entryX = endX - Math.min(gridSize * 2, dx / 3);
            path.push({ x: entryX, y: snapToGrid(startY + dy / 2) });
            path.push({ x: entryX, y: endY });
        }
    } else {
        // End is to the left of start (need to route around)
        const offsetY = dy > 0 ? gridSize * 3 : -gridSize * 3;

        path.push({ x: startX + gridSize * 2, y: startY });
        path.push({ x: startX + gridSize * 2, y: startY + offsetY });
        path.push({ x: endX - gridSize * 2, y: startY + offsetY });
        path.push({ x: endX - gridSize * 2, y: endY });
    }

    path.push({ x: endX, y: endY });

    return path;
}
