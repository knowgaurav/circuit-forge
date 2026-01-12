/**
 * @file powerSymbols.ts
 * @description Drawing functions for power and ground symbols (VCC, GND)
 * @module features/canvas/symbols
 */

/**
 * Draws a VCC (positive voltage) supply symbol.
 * Arrow pointing up with VCC label.
 */
export function drawVccSymbol(
    ctx: CanvasRenderingContext2D,
    _width: number,
    height: number
): void {
    // Glow effect
    ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
    ctx.shadowBlur = 6;

    // Arrow pointing up
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, height / 2 - 6);
    ctx.lineTo(0, -height / 2 + 12);
    ctx.stroke();

    // Triangle at top with gradient
    const gradient = ctx.createLinearGradient(0, -height / 2, 0, -height / 2 + 12);
    gradient.addColorStop(0, '#F87171');
    gradient.addColorStop(1, '#DC2626');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -height / 2 + 2);
    ctx.lineTo(-8, -height / 2 + 14);
    ctx.lineTo(8, -height / 2 + 14);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#B91C1C';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#991B1B';
    ctx.font = 'bold 9px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VCC', 0, height / 2 - 6);
}

/**
 * Draws a ground symbol with tiered horizontal bars.
 */
export function drawGroundSymbol(
    ctx: CanvasRenderingContext2D,
    _width: number,
    height: number
): void {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(0, -height / 2 + 4);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Ground bars with gradient effect
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 5);
    ctx.lineTo(8, 5);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(4, 10);
    ctx.stroke();
}

/**
 * Draws a junction (wire connection point) symbol.
 */
export function drawJunctionSymbol(
    ctx: CanvasRenderingContext2D,
    _width: number,
    _height: number
): void {
    // Simple dot for junction
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
}
