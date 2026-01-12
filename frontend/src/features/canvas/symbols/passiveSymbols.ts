/**
 * @file passiveSymbols.ts
 * @description Drawing functions for passive component symbols (resistor, capacitor, diode)
 * @module features/canvas/symbols
 */

/**
 * Draws a resistor symbol using the zigzag (American) style.
 */
export function drawResistorSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Zigzag resistor symbol
    const zigWidth = 6;
    const zigHeight = height * 0.6;

    ctx.beginPath();
    ctx.moveTo(-width / 2 + 8, 0);
    ctx.lineTo(-zigWidth * 3, 0);
    ctx.lineTo(-zigWidth * 2.5, -zigHeight / 2);
    ctx.lineTo(-zigWidth * 1.5, zigHeight / 2);
    ctx.lineTo(-zigWidth * 0.5, -zigHeight / 2);
    ctx.lineTo(zigWidth * 0.5, zigHeight / 2);
    ctx.lineTo(zigWidth * 1.5, -zigHeight / 2);
    ctx.lineTo(zigWidth * 2.5, zigHeight / 2);
    ctx.lineTo(zigWidth * 3, 0);
    ctx.lineTo(width / 2 - 8, 0);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#6B7280';
    ctx.font = '8px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('R', 0, height / 2 - 4);
}

/**
 * Draws a capacitor symbol with parallel plates.
 */
export function drawCapacitorSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const plateHeight = height * 0.5;
    const gap = 6;

    // Left lead
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 8, 0);
    ctx.lineTo(-gap / 2, 0);
    ctx.stroke();

    // Left plate
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-gap / 2, -plateHeight / 2);
    ctx.lineTo(-gap / 2, plateHeight / 2);
    ctx.stroke();

    // Right plate
    ctx.beginPath();
    ctx.moveTo(gap / 2, -plateHeight / 2);
    ctx.lineTo(gap / 2, plateHeight / 2);
    ctx.stroke();

    // Right lead
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gap / 2, 0);
    ctx.lineTo(width / 2 - 8, 0);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#6B7280';
    ctx.font = '8px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('C', 0, height / 2 - 4);
}

/**
 * Draws a diode symbol with triangle and bar.
 */
export function drawDiodeSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number
): void {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const triSize = 12;

    // Left lead
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 8, 0);
    ctx.lineTo(-triSize / 2, 0);
    ctx.stroke();

    // Triangle (anode)
    ctx.fillStyle = '#E5E7EB';
    ctx.beginPath();
    ctx.moveTo(-triSize / 2, -triSize / 2);
    ctx.lineTo(triSize / 2, 0);
    ctx.lineTo(-triSize / 2, triSize / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cathode bar
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(triSize / 2, -triSize / 2);
    ctx.lineTo(triSize / 2, triSize / 2);
    ctx.stroke();

    // Right lead
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(triSize / 2, 0);
    ctx.lineTo(width / 2 - 8, 0);
    ctx.stroke();
}
