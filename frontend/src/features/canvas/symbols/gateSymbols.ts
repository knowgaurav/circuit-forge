/**
 * @file gateSymbols.ts
 * @description Drawing functions for logic gate symbols (AND, OR, NOT, NAND, NOR, XOR, XNOR)
 * @module features/canvas/symbols
 */

/**
 * Draws an AND gate symbol (IEEE standard).
 * Flat left side with curved right side forming the characteristic AND shape.
 */
export function drawAndGateSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isNand: boolean
): void {
    const w = width * 0.75;
    const h = height * 0.85;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Gate body - IEEE AND shape
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 6, -h / 2);
    ctx.bezierCurveTo(w / 2 + 5, -h / 2, w / 2 + 5, h / 2, w / 6, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gradient.addColorStop(0, '#FAFAFA');
    gradient.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inversion bubble for NAND
    if (isNand) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#374151';
        ctx.beginPath();
        ctx.arc(w / 2 + 6, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('&', -4, 0);
}

/**
 * Draws an OR gate symbol (IEEE standard).
 * Curved back with pointed front.
 */
export function drawOrGateSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isNor: boolean
): void {
    const w = width * 0.75;
    const h = height * 0.85;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Gate body - IEEE OR shape with curved back
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.quadraticCurveTo(-w / 4, 0, -w / 2, h / 2);
    ctx.bezierCurveTo(0, h / 2, w / 3, h / 3, w / 2 + 2, 0);
    ctx.bezierCurveTo(w / 3, -h / 3, 0, -h / 2, -w / 2, -h / 2);
    ctx.closePath();

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gradient.addColorStop(0, '#FAFAFA');
    gradient.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inversion bubble for NOR
    if (isNor) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#374151';
        ctx.beginPath();
        ctx.arc(w / 2 + 8, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 12px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('≥1', 0, 0);
}

/**
 * Draws an XOR gate symbol (IEEE standard).
 * OR shape with extra curved line at input.
 */
export function drawXorGateSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isXnor: boolean
): void {
    const w = width * 0.75;
    const h = height * 0.85;

    // Shadow for main body
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Main OR-shaped body
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.quadraticCurveTo(-w / 4, 0, -w / 2, h / 2);
    ctx.bezierCurveTo(0, h / 2, w / 3, h / 3, w / 2 + 2, 0);
    ctx.bezierCurveTo(w / 3, -h / 3, 0, -h / 2, -w / 2, -h / 2);
    ctx.closePath();

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gradient.addColorStop(0, '#FAFAFA');
    gradient.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Extra curved line for XOR (before the body)
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 8, -h / 2);
    ctx.quadraticCurveTo(-w / 4 - 8, 0, -w / 2 - 8, h / 2);
    ctx.stroke();

    // Inversion bubble for XNOR
    if (isXnor) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#374151';
        ctx.beginPath();
        ctx.arc(w / 2 + 8, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 12px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('=1', 0, 0);
}

/**
 * Draws a NOT gate (inverter) or BUFFER symbol.
 * Triangle shape with optional inversion bubble.
 */
export function drawNotGateSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    hasInversion: boolean
): void {
    const w = width * 0.65;
    const h = height * 0.85;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Triangle body
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2 - 6, 0);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gradient.addColorStop(0, '#FAFAFA');
    gradient.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inversion bubble
    if (hasInversion) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#374151';
        ctx.beginPath();
        ctx.arc(w / 2, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 12px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', -6, 0);
}
