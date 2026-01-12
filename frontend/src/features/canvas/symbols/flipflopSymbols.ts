/**
 * @file flipflopSymbols.ts
 * @description Drawing functions for flip-flop and latch symbols (D, SR, JK)
 * @module features/canvas/symbols
 */

/**
 * Draws a flip-flop symbol with type-specific labels.
 * Supports D flip-flop, SR latch, and JK flip-flop.
 */
export function drawFlipFlopSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    type: string
): void {
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Body with rounded corners
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 4);

    const gradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    gradient.addColorStop(0, '#FEF3C7');
    gradient.addColorStop(1, '#FDE68A');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Divider line
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -height / 2 + 6);
    ctx.lineTo(0, height / 2 - 6);
    ctx.stroke();

    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 10px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (type === 'D_FLIPFLOP') {
        ctx.fillText('D', -width / 4, -height / 4);
        ctx.fillText('Q', width / 4, -height / 4);
        // Clock triangle
        ctx.beginPath();
        ctx.moveTo(-width / 2 + 6, height / 4 - 4);
        ctx.lineTo(-width / 2 + 12, height / 4);
        ctx.lineTo(-width / 2 + 6, height / 4 + 4);
        ctx.stroke();
        ctx.fillText("Q'", width / 4, height / 4);
    } else if (type === 'SR_LATCH') {
        ctx.fillText('S', -width / 4, -height / 4);
        ctx.fillText('Q', width / 4, -height / 4);
        ctx.fillText('R', -width / 4, height / 4);
        ctx.fillText("Q'", width / 4, height / 4);
    } else if (type === 'JK_FLIPFLOP') {
        ctx.fillText('J', -width / 4, -height / 4);
        ctx.fillText('Q', width / 4, -height / 4);
        // Clock triangle
        ctx.beginPath();
        ctx.moveTo(-width / 2 + 6, -4);
        ctx.lineTo(-width / 2 + 12, 0);
        ctx.lineTo(-width / 2 + 6, 4);
        ctx.stroke();
        ctx.fillText('K', -width / 4, height / 4);
        ctx.fillText("Q'", width / 4, height / 4);
    }
}
