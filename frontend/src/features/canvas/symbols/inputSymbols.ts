/**
 * @file inputSymbols.ts
 * @description Drawing functions for input component symbols (switches, clock, constants)
 * @module features/canvas/symbols
 */

/**
 * Draws a toggle switch (SPST) schematic symbol.
 * Shows lever position based on on/off state.
 */
export function drawToggleSwitchSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isOn = false
): void {
    // SPST Switch schematic symbol
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // Left terminal (fixed contact)
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 6, 0);
    ctx.lineTo(-10, 0);
    ctx.stroke();

    // Left contact point
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(-10, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Right terminal
    ctx.beginPath();
    ctx.moveTo(width / 2 - 6, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();

    // Right contact point (where lever connects when ON)
    ctx.beginPath();
    ctx.arc(10, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Switch lever (arm)
    ctx.strokeStyle = isOn ? '#22C55E' : '#374151';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    if (isOn) {
        // Lever horizontal - closed/ON
        ctx.lineTo(10, 0);
    } else {
        // Lever angled up - open/OFF
        ctx.lineTo(8, -12);
    }
    ctx.stroke();

    // Lever knob
    ctx.fillStyle = isOn ? '#22C55E' : '#6B7280';
    ctx.beginPath();
    if (isOn) {
        ctx.arc(10, 0, 4, 0, Math.PI * 2);
    } else {
        ctx.arc(8, -12, 4, 0, Math.PI * 2);
    }
    ctx.fill();

    // State label
    ctx.fillStyle = isOn ? '#16A34A' : '#6B7280';
    ctx.font = 'bold 8px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isOn ? 'ON' : 'OFF', 0, height / 2 - 4);
}

/**
 * Draws a push button (momentary switch) schematic symbol.
 * Shows contact bar position based on pressed state.
 */
export function drawPushButtonSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isPressed = false
): void {
    // Normally-Open Momentary Push Button schematic symbol
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // Left terminal
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 6, 0);
    ctx.lineTo(-8, 0);
    ctx.stroke();

    // Left contact
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(-8, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Right terminal
    ctx.beginPath();
    ctx.moveTo(width / 2 - 6, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();

    // Right contact
    ctx.beginPath();
    ctx.arc(8, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Contact bar (the part that moves)
    ctx.strokeStyle = isPressed ? '#22C55E' : '#374151';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (isPressed) {
        // Pressed - bar connects contacts
        ctx.moveTo(-8, -2);
        ctx.lineTo(8, -2);
    } else {
        // Not pressed - bar is raised
        ctx.moveTo(-8, -8);
        ctx.lineTo(8, -8);
    }
    ctx.stroke();

    // Push button actuator (vertical line with arrow)
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, -16);
    ctx.stroke();

    // Arrow head pointing down
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.lineTo(0, -8);
    ctx.lineTo(4, -12);
    ctx.stroke();

    // Label
    ctx.fillStyle = isPressed ? '#16A34A' : '#6B7280';
    ctx.font = 'bold 7px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PB', 0, height / 2 - 4);
}

/**
 * Draws a clock signal source symbol.
 * Shows square wave pattern inside a rounded rectangle.
 */
export function drawClockSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Body with rounded corners
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 4);

    const gradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    gradient.addColorStop(0, '#EFF6FF');
    gradient.addColorStop(1, '#DBEAFE');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Clock wave with better styling
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(-12, -4);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.lineTo(4, -4);
    ctx.lineTo(12, -4);
    ctx.stroke();

    ctx.fillStyle = '#1E40AF';
    ctx.font = 'bold 8px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLK', 0, 14);
}

/**
 * Draws a constant HIGH (logic 1) source symbol.
 */
export function drawConstHighSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number
): void {
    // Logic HIGH (1) source - square wave at high level
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // Output terminal
    ctx.beginPath();
    ctx.moveTo(width / 2 - 6, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();

    // High level indicator box
    ctx.fillStyle = '#DCFCE7';
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-12, -10, 20, 20, 3);
    ctx.fill();
    ctx.stroke();

    // "1" label inside
    ctx.fillStyle = '#166534';
    ctx.font = 'bold 14px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', -2, 0);

    // High level line on top
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.lineTo(8, -12);
    ctx.stroke();
}

/**
 * Draws a constant LOW (logic 0) source symbol.
 */
export function drawConstLowSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number
): void {
    // Logic LOW (0) source - square wave at low level
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // Output terminal
    ctx.beginPath();
    ctx.moveTo(width / 2 - 6, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();

    // Low level indicator box
    ctx.fillStyle = '#F3F4F6';
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-12, -10, 20, 20, 3);
    ctx.fill();
    ctx.stroke();

    // "0" label inside
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', -2, 0);

    // Low level line on bottom
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, 12);
    ctx.lineTo(8, 12);
    ctx.stroke();
}

/**
 * Draws a 4-position DIP switch symbol.
 */
export function drawDipSwitchSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    // Body
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 3);

    const gradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    gradient.addColorStop(0, '#FEF3C7');
    gradient.addColorStop(1, '#FDE68A');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw 4 mini switches
    const switchWidth = 8;
    const switchHeight = 12;
    const startX = -width / 2 + 14;
    const gap = 12;

    for (let i = 0; i < 4; i++) {
        const x = startX + i * gap;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - switchWidth / 2, -switchHeight / 2, switchWidth, switchHeight);
        ctx.strokeStyle = '#9CA3AF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - switchWidth / 2, -switchHeight / 2, switchWidth, switchHeight);

        // Switch position indicator
        ctx.fillStyle = '#374151';
        ctx.fillRect(
            x - switchWidth / 2 + 1,
            -switchHeight / 2 + 1,
            switchWidth - 2,
            switchHeight / 2 - 1
        );
    }

    // Label
    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 7px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DIP', 0, height / 2 - 8);
}

/**
 * Draws a numeric input symbol with up/down controls.
 */
export function drawNumericInputSymbol(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    // Body
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 4);

    const gradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    gradient.addColorStop(0, '#DBEAFE');
    gradient.addColorStop(1, '#BFDBFE');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Display area
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(-width / 2 + 10, -height / 2 + 10, width - 20, height - 24);

    // Number display
    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 16px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('00', 0, -2);

    // Up/down arrows
    ctx.fillStyle = '#3B82F6';
    ctx.font = '10px sans-serif';
    ctx.fillText('▲', width / 2 - 14, -6);
    ctx.fillText('▼', width / 2 - 14, 8);
}
