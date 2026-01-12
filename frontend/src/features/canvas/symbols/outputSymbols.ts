/**
 * @file outputSymbols.ts
 * @description Drawing functions for output component symbols (LEDs, displays, probe)
 * @module features/canvas/symbols
 */

/**
 * Draws an LED schematic symbol with optional glow effect.
 * Uses standard diode symbol with light emission arrows.
 */
export function drawLedSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number,
    color: string,
    isLit = false
): void {
    // LED schematic symbol: diode with light arrows
    const triSize = 14;

    // Glow effect when lit
    if (isLit) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
    }

    // Left lead (anode)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 6, 0);
    ctx.lineTo(-triSize / 2, 0);
    ctx.stroke();

    // Diode triangle (anode)
    ctx.fillStyle = isLit ? color : color + '40';
    ctx.strokeStyle = isLit ? color : '#374151';
    ctx.lineWidth = 2;
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

    ctx.shadowBlur = 0;

    // Right lead (cathode)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(triSize / 2, 0);
    ctx.lineTo(width / 2 - 6, 0);
    ctx.stroke();

    // Light emission arrows (always shown, but brighter when lit)
    ctx.strokeStyle = isLit ? color : color + '60';
    ctx.lineWidth = 1.5;

    // Arrow 1 (upper)
    ctx.beginPath();
    ctx.moveTo(2, -triSize / 2 - 2);
    ctx.lineTo(8, -triSize - 4);
    ctx.stroke();
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(8, -triSize - 4);
    ctx.lineTo(4, -triSize - 2);
    ctx.moveTo(8, -triSize - 4);
    ctx.lineTo(6, -triSize);
    ctx.stroke();

    // Arrow 2 (lower)
    ctx.beginPath();
    ctx.moveTo(6, -triSize / 2 + 2);
    ctx.lineTo(12, -triSize);
    ctx.stroke();
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(12, -triSize);
    ctx.lineTo(8, -triSize + 2);
    ctx.moveTo(12, -triSize);
    ctx.lineTo(10, -triSize + 4);
    ctx.stroke();
}

/**
 * Draws a 7-segment display symbol showing all segments lit.
 */
export function draw7SegmentSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Body
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 4);
    ctx.fillStyle = '#111827';
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Display background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12);

    // Glow effect for segments
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 8;

    // Draw "8" pattern with glow
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const segW = 14;
    const segH = 16;
    // Top
    ctx.beginPath();
    ctx.moveTo(-segW / 2, -segH);
    ctx.lineTo(segW / 2, -segH);
    ctx.stroke();
    // Middle
    ctx.beginPath();
    ctx.moveTo(-segW / 2, 0);
    ctx.lineTo(segW / 2, 0);
    ctx.stroke();
    // Bottom
    ctx.beginPath();
    ctx.moveTo(-segW / 2, segH);
    ctx.lineTo(segW / 2, segH);
    ctx.stroke();
    // Left top
    ctx.beginPath();
    ctx.moveTo(-segW / 2, -segH);
    ctx.lineTo(-segW / 2, 0);
    ctx.stroke();
    // Left bottom
    ctx.beginPath();
    ctx.moveTo(-segW / 2, 0);
    ctx.lineTo(-segW / 2, segH);
    ctx.stroke();
    // Right top
    ctx.beginPath();
    ctx.moveTo(segW / 2, -segH);
    ctx.lineTo(segW / 2, 0);
    ctx.stroke();
    // Right bottom
    ctx.beginPath();
    ctx.moveTo(segW / 2, 0);
    ctx.lineTo(segW / 2, segH);
    ctx.stroke();

    ctx.shadowBlur = 0;
}

/**
 * Draws a signal probe symbol showing current logic state.
 */
export function drawProbeSymbol(
    ctx: CanvasRenderingContext2D,
    _width: number,
    height: number,
    isHigh = false
): void {
    // Probe indicator - shows signal state
    ctx.fillStyle = isHigh ? '#22C55E' : '#6B7280';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;

    // Circle indicator
    ctx.beginPath();
    ctx.arc(0, 0, height / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // State text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isHigh ? '1' : '0', 0, 0);

    // Glow effect when HIGH
    if (isHigh) {
        ctx.shadowColor = '#22C55E';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, height / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
