/**
 * @file baseSymbols.ts
 * @description Base drawing utilities and common symbol functions
 * @module features/canvas/symbols
 */

/**
 * Draws the base IC chip body with shadow and notch.
 * Used as a foundation for sequential and combinational IC symbols.
 */
export function drawICBase(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    colorDark: string,
    colorLight: string
): void {
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Chip body
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 3);

    const gradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    gradient.addColorStop(0, colorLight);
    gradient.addColorStop(1, colorDark);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Notch at top
    ctx.fillStyle = colorLight + '80';
    ctx.beginPath();
    ctx.arc(0, -height / 2 + 4, 4, 0, Math.PI);
    ctx.fill();
}

/**
 * Draws a default styled component box for unknown types.
 */
export function drawDefaultComponent(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    type: string,
    isDarkMode: boolean
): void {
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Rounded rectangle body
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 4);

    const gradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    gradient.addColorStop(0, isDarkMode ? '#4a4a6a' : '#F9FAFB');
    gradient.addColorStop(1, isDarkMode ? '#3a3a5a' : '#E5E7EB');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = isDarkMode ? '#6a6a8a' : '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = isDarkMode ? '#e0e0e0' : '#374151';
    ctx.font = 'bold 9px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = type.replace(/_/g, ' ');
    ctx.fillText(label.length > 10 ? label.substring(0, 10) : label, 0, 0);
}
