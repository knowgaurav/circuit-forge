/**
 * @file combinationalSymbols.ts
 * @description Drawing functions for combinational logic symbols (MUX, decoder, adder, etc.)
 * @module features/canvas/symbols
 */

import { drawICBase } from './baseSymbols';

/**
 * Draws a 2-to-1 multiplexer symbol.
 * Trapezoid shape with multiple inputs and single output.
 */
export function drawMuxSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Trapezoid shape - wide input side, narrow output side
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 4, -height / 2 + 4);
    ctx.lineTo(width / 2 - 4, -height / 3);
    ctx.lineTo(width / 2 - 4, height / 3);
    ctx.lineTo(-width / 2 + 4, height / 2 - 4);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    gradient.addColorStop(0, '#F3E8FF');
    gradient.addColorStop(1, '#DDD6FE');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Input arrows showing multiple inputs
    ctx.strokeStyle = '#9333EA';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Multiple input lines on left
    ctx.moveTo(-width / 2 + 8, -height / 3);
    ctx.lineTo(-width / 2 + 16, -height / 3);
    ctx.moveTo(-width / 2 + 8, 0);
    ctx.lineTo(-width / 2 + 16, 0);
    ctx.moveTo(-width / 2 + 8, height / 3);
    ctx.lineTo(-width / 2 + 16, height / 3);
    ctx.stroke();

    // Output arrow on right
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 16, 0);
    ctx.lineTo(width / 2 - 8, 0);
    ctx.stroke();

    // SEL label at bottom
    ctx.fillStyle = '#7C3AED';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SEL', 0, height / 3 + 4);

    // MUX label
    ctx.font = 'bold 9px "SF Pro Display", -apple-system, sans-serif';
    ctx.fillText('MUX', 0, -4);
}

/**
 * Draws a traffic light controller symbol.
 */
export function drawTrafficLightCtrlSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    // Box with traffic light icon
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(-width / 2, -height / 2, width, height);

    // Draw mini traffic light representation
    const lightRadius = 5;
    const spacing = 14;

    // Red light
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, -spacing, lightRadius, 0, Math.PI * 2);
    ctx.fill();

    // Yellow light
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(0, 0, lightRadius, 0, Math.PI * 2);
    ctx.fill();

    // Green light
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(0, spacing, lightRadius, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('CTRL', 0, height / 2 - 10);
}

/**
 * Draws a 4-bit counter symbol.
 */
export function drawCounterSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    drawICBase(ctx, width, height, '#1E3A8A', '#1E40AF');

    // Count display showing "0→F" to indicate counting
    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 10px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0→F', 0, -8);

    // Up arrow indicating count up
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(0, 6);
    ctx.moveTo(-4, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(4, 10);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#93C5FD';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.fillText('COUNTER', 0, height / 2 - 10);
}

/**
 * Draws an 8-bit shift register symbol.
 */
export function drawShiftRegisterSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    drawICBase(ctx, width, height, '#7C2D12', '#9A3412');

    // Shift arrows showing data movement
    ctx.strokeStyle = '#FDBA74';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // Draw shifting boxes with arrow
    const boxSize = 10;
    const startX = -20;
    for (let i = 0; i < 4; i++) {
        const x = startX + i * 12;
        ctx.strokeStyle = '#FDBA74';
        ctx.strokeRect(x, -boxSize / 2, boxSize, boxSize);
    }

    // Arrow showing shift direction
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(22, 0);
    ctx.moveTo(18, -4);
    ctx.lineTo(22, 0);
    ctx.lineTo(18, 4);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#FED7AA';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHIFT REG', 0, height / 2 - 10);
}

/**
 * Draws a 4-bit adder symbol.
 */
export function drawAdderSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    drawICBase(ctx, width, height, '#14532D', '#166534');

    // Large plus symbol
    ctx.strokeStyle = '#86EFAC';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.stroke();

    // A + B labels
    ctx.fillStyle = '#86EFAC';
    ctx.font = 'bold 8px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', -18, -8);
    ctx.fillText('B', -18, 8);
    ctx.fillText('Σ', 18, 0);

    // Label
    ctx.fillStyle = '#BBF7D0';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.fillText('ADDER', 0, height / 2 - 10);
}

/**
 * Draws a 4-bit comparator symbol.
 */
export function drawComparatorSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    drawICBase(ctx, width, height, '#581C87', '#6B21A8');

    // Comparison symbols
    ctx.fillStyle = '#D8B4FE';
    ctx.font = 'bold 10px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', -16, 0);
    ctx.fillText('B', 16, 0);

    // Comparison operators in center
    ctx.font = 'bold 8px "SF Pro Display", -apple-system, sans-serif';
    ctx.fillText('< = >', 0, 0);

    // Label
    ctx.fillStyle = '#E9D5FF';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.fillText('COMPARE', 0, height / 2 - 10);
}

/**
 * Draws a 2-to-4 decoder symbol.
 */
export function drawDecoderSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    drawICBase(ctx, width, height, '#0C4A6E', '#075985');

    // Input lines converging to expansion
    ctx.strokeStyle = '#7DD3FC';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // Input side (narrow)
    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(-8, -6);
    ctx.moveTo(-18, 6);
    ctx.lineTo(-8, 6);
    ctx.stroke();

    // Expansion triangle
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(8, -16);
    ctx.moveTo(-8, 10);
    ctx.lineTo(8, 16);
    ctx.moveTo(-8, -10);
    ctx.lineTo(-8, 10);
    ctx.stroke();

    // Output lines (expanded)
    ctx.beginPath();
    ctx.moveTo(8, -16);
    ctx.lineTo(18, -16);
    ctx.moveTo(8, -6);
    ctx.lineTo(18, -6);
    ctx.moveTo(8, 6);
    ctx.lineTo(18, 6);
    ctx.moveTo(8, 16);
    ctx.lineTo(18, 16);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#BAE6FD';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DECODER', 0, height / 2 - 10);
}
