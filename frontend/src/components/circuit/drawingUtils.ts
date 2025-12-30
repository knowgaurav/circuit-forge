/**
 * Shared drawing utilities for circuit canvas rendering
 * Used by both Canvas.tsx and MiniCanvas.tsx
 */

import type { CircuitComponent, Wire } from '@/types';
import { getComponentDefinition } from '@/constants/components';
import type { SignalState } from '@/services/simulation';

// ============================================================================
// COMPONENT DRAWING
// ============================================================================

export function drawComponent(
    ctx: CanvasRenderingContext2D,
    component: CircuitComponent,
    options: {
        isSelected?: boolean;
        isDarkMode?: boolean;
        pinStates?: Record<string, SignalState>;
        showLabel?: boolean;
        showPins?: boolean;
    } = {}
) {
    const { position, type, label } = component;
    const def = getComponentDefinition(type);
    const width = def?.width || 60;
    const height = def?.height || 40;
    const { isSelected = false, isDarkMode = true, pinStates, showLabel = true, showPins = true } = options;

    ctx.save();
    ctx.translate(position.x, position.y);

    // Selection highlight
    if (isSelected) {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8);
        ctx.setLineDash([]);
    }

    // Get input signal for LEDs
    let inputSignal: SignalState | undefined;
    if (pinStates) {
        const inputPin = component.pins.find(p => p.type === 'input');
        if (inputPin) inputSignal = pinStates[inputPin.id];
    }

    // Draw component symbol
    drawComponentSymbol(ctx, type, width, height, isDarkMode, inputSignal, component.properties, component.pins, pinStates);

    // Draw label
    if (showLabel && label) {
        ctx.fillStyle = isDarkMode ? '#9ca3af' : '#6B7280';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, 0, height / 2 + 12);
    }

    ctx.restore();

    // Draw pins
    if (showPins) {
        component.pins.forEach(pin => {
            const pinX = position.x + pin.position.x;
            const pinY = position.y + pin.position.y;
            ctx.fillStyle = pin.type === 'input' ? '#22C55E' : '#EF4444';
            ctx.beginPath();
            ctx.arc(pinX, pinY, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

export function drawComponentSymbol(
    ctx: CanvasRenderingContext2D,
    type: string,
    width: number,
    height: number,
    isDarkMode = false,
    signalState?: SignalState,
    properties?: Record<string, unknown>,
    pins?: { id: string; name: string; type: 'input' | 'output'; position: { x: number; y: number } }[],
    pinStates?: Record<string, SignalState>
) {
    // Logic Gates
    if (type.startsWith('AND') || type.startsWith('NAND')) {
        drawAndGate(ctx, width, height, type.startsWith('NAND'));
    } else if (type.startsWith('OR') || type.startsWith('NOR')) {
        drawOrGate(ctx, width, height, type.startsWith('NOR'));
    } else if (type === 'NOT' || type === 'BUFFER') {
        drawNotGate(ctx, width, height, type === 'NOT');
    } else if (type.startsWith('XOR') || type.startsWith('XNOR')) {
        drawXorGate(ctx, width, height, type.startsWith('XNOR'));
    }
    // Input Devices
    else if (type === 'SWITCH_TOGGLE') {
        drawToggleSwitch(ctx, width, height, properties?.state === true);
    } else if (type === 'SWITCH_PUSH') {
        drawPushButton(ctx, width, height, properties?.state === true);
    } else if (type === 'CLOCK') {
        drawClock(ctx, width, height);
    } else if (type === 'CONST_HIGH') {
        drawConstHigh(ctx, width, height);
    } else if (type === 'CONST_LOW') {
        drawConstLow(ctx, width, height);
    }
    // Output Devices
    else if (type.startsWith('LED_')) {
        const color = type === 'LED_RED' ? '#EF4444' : type === 'LED_GREEN' ? '#22C55E' : type === 'LED_BLUE' ? '#3B82F6' : '#FBBF24';
        drawLed(ctx, width, height, color, signalState === 'HIGH');
    } else if (type === 'DISPLAY_7SEG') {
        // Get segment states from pinStates
        const segments: Record<string, boolean> = {};
        if (pins && pinStates) {
            for (const pin of pins) {
                if (pin.type === 'input') {
                    segments[pin.name] = pinStates[pin.id] === 'HIGH';
                }
            }
        }
        draw7Segment(ctx, width, height, segments);
    }
    // Sequential Logic
    else if (type === 'D_FLIPFLOP' || type === 'SR_LATCH' || type === 'JK_FLIPFLOP' || type === 'T_FLIPFLOP') {
        drawFlipFlop(ctx, width, height, type);
    } else if (type === 'COUNTER_4BIT') {
        drawCounter(ctx, width, height);
    } else if (type === 'SHIFT_REGISTER_8BIT') {
        drawShiftRegister(ctx, width, height);
    }
    // Combinational Logic
    else if (type.startsWith('MUX')) {
        drawMux(ctx, width, height);
    } else if (type === 'DECODER_2TO4') {
        drawDecoder(ctx, width, height);
    }
    // Power
    else if (type === 'VCC_5V' || type === 'VCC_3V3') {
        drawVcc(ctx, width, height);
    } else if (type === 'GROUND') {
        drawGround(ctx, width, height);
    }
    // Passive
    else if (type === 'RESISTOR') {
        drawResistor(ctx, width, height);
    } else if (type === 'CAPACITOR') {
        drawCapacitor(ctx, width, height);
    } else if (type === 'DIODE') {
        drawDiode(ctx, width, height);
    }
    // Connectors
    else if (type === 'JUNCTION') {
        drawJunction(ctx, width, height);
    } else if (type === 'PROBE') {
        drawProbe(ctx, width, height, signalState === 'HIGH');
    }
    // Motor
    else if (type === 'MOTOR_DC') {
        // Check FWD and REV pin states
        let fwdHigh = false;
        let revHigh = false;
        if (pinStates && pins) {
            const fwdPin = pins.find(p => p.name === 'FWD');
            const revPin = pins.find(p => p.name === 'REV');
            if (fwdPin) fwdHigh = pinStates[fwdPin.id] === 'HIGH';
            if (revPin) revHigh = pinStates[revPin.id] === 'HIGH';
        }
        drawMotor(ctx, width, height, fwdHigh, revHigh);
    }
    // Buzzer
    else if (type === 'BUZZER') {
        const isActive = signalState === 'HIGH';
        drawBuzzer(ctx, width, height, isActive);
    }
    // Default
    else {
        drawDefault(ctx, width, height, type, isDarkMode);
    }
}

// ============================================================================
// WIRE DRAWING
// ============================================================================

export function drawWire(
    ctx: CanvasRenderingContext2D,
    wire: Wire,
    components: CircuitComponent[],
    wireState?: SignalState
) {
    const fromComp = components.find(c => c.id === wire.fromComponentId);
    const toComp = components.find(c => c.id === wire.toComponentId);
    if (!fromComp || !toComp) return;

    const fromPin = fromComp.pins.find(p => p.id === wire.fromPinId);
    const toPin = toComp.pins.find(p => p.id === wire.toPinId);
    if (!fromPin || !toPin) return;

    const fromX = fromComp.position.x + fromPin.position.x;
    const fromY = fromComp.position.y + fromPin.position.y;
    const toX = toComp.position.x + toPin.position.x;
    const toY = toComp.position.y + toPin.position.y;

    const isHigh = wireState === 'HIGH';

    ctx.strokeStyle = isHigh ? '#22C55E' : '#6b7280';
    ctx.lineWidth = isHigh ? 2.5 : 2;
    ctx.lineCap = 'round';

    // Glow effect for HIGH wires
    if (isHigh) {
        ctx.shadowColor = '#22C55E';
        ctx.shadowBlur = 6;
    }

    // Draw orthogonal wire
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    const midX = (fromX + toX) / 2;
    ctx.lineTo(midX, fromY);
    ctx.lineTo(midX, toY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.shadowBlur = 0;
}

// ============================================================================
// GRID DRAWING
// ============================================================================

export function drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isDarkMode = true
) {
    ctx.fillStyle = isDarkMode ? '#2a2a3a' : '#e5e7eb';
    for (let x = 20; x < width; x += 20) {
        for (let y = 20; y < height; y += 20) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ============================================================================
// INDIVIDUAL COMPONENT SYMBOLS
// ============================================================================

function drawAndGate(ctx: CanvasRenderingContext2D, w: number, h: number, isNand: boolean) {
    const gw = w * 0.7, gh = h * 0.8;
    ctx.fillStyle = '#e8e8f0';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-gw / 2, -gh / 2);
    ctx.lineTo(gw / 6, -gh / 2);
    ctx.bezierCurveTo(gw / 2 + 4, -gh / 2, gw / 2 + 4, gh / 2, gw / 6, gh / 2);
    ctx.lineTo(-gw / 2, gh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (isNand) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gw / 2 + 5, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('&', -4, 0);
}

function drawOrGate(ctx: CanvasRenderingContext2D, w: number, h: number, isNor: boolean) {
    const gw = w * 0.7, gh = h * 0.8;
    ctx.fillStyle = '#e8e8f0';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-gw / 2, -gh / 2);
    ctx.quadraticCurveTo(-gw / 4, 0, -gw / 2, gh / 2);
    ctx.quadraticCurveTo(gw / 4, gh / 2, gw / 2, 0);
    ctx.quadraticCurveTo(gw / 4, -gh / 2, -gw / 2, -gh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (isNor) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gw / 2 + 5, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('≥1', -2, 0);
}

function drawNotGate(ctx: CanvasRenderingContext2D, w: number, h: number, hasInvert: boolean) {
    const gw = w * 0.6, gh = h * 0.7;
    ctx.fillStyle = '#e8e8f0';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-gw / 2, -gh / 2);
    ctx.lineTo(gw / 2 - 4, 0);
    ctx.lineTo(-gw / 2, gh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (hasInvert) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gw / 2, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', -6, 0);
}

function drawXorGate(ctx: CanvasRenderingContext2D, w: number, h: number, isXnor: boolean) {
    drawOrGate(ctx, w, h, isXnor);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    const gw = w * 0.7, gh = h * 0.8;
    ctx.beginPath();
    ctx.moveTo(-gw / 2 - 6, -gh / 2);
    ctx.quadraticCurveTo(-gw / 4 - 6, 0, -gw / 2 - 6, gh / 2);
    ctx.stroke();
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('=1', -2, 0);
}

function drawToggleSwitch(ctx: CanvasRenderingContext2D, w: number, h: number, isOn: boolean) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    // Contacts
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(-w / 3, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w / 3, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    // Lever
    ctx.strokeStyle = isOn ? '#22C55E' : '#6b7280';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w / 3, 0);
    ctx.lineTo(isOn ? w / 3 : w / 4, isOn ? 0 : -h / 3);
    ctx.stroke();
    // State label
    ctx.fillStyle = isOn ? '#22C55E' : '#6b7280';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isOn ? 'ON' : 'OFF', 0, h / 2 - 2);
}

function drawPushButton(ctx: CanvasRenderingContext2D, w: number, h: number, isPressed: boolean) {
    ctx.fillStyle = '#374151';
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    // Contact points
    ctx.beginPath();
    ctx.arc(-w / 3, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w / 3, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    // Button bar
    ctx.strokeStyle = isPressed ? '#22C55E' : '#6b7280';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w / 3 + 4, isPressed ? 0 : -6);
    ctx.lineTo(w / 3 - 4, isPressed ? 0 : -6);
    ctx.stroke();
    // Push arrow
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h / 3);
    ctx.lineTo(0, isPressed ? -2 : -8);
    ctx.moveTo(-3, -h / 3 + 3);
    ctx.lineTo(0, -h / 3);
    ctx.lineTo(3, -h / 3 + 3);
    ctx.stroke();
}

function drawLed(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, isLit: boolean) {
    // Diode triangle
    ctx.fillStyle = isLit ? color : '#374151';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 4, -h / 3);
    ctx.lineTo(w / 4, 0);
    ctx.lineTo(-w / 4, h / 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cathode bar
    ctx.beginPath();
    ctx.moveTo(w / 4, -h / 3);
    ctx.lineTo(w / 4, h / 3);
    ctx.stroke();
    // Light rays
    if (isLit) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(w / 3, i * 6);
            ctx.lineTo(w / 2 + 2, i * 9);
            ctx.stroke();
        }
    }
}

function drawClock(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#e8e8f0';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4);
    ctx.fill();
    ctx.stroke();
    // Clock wave
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 4, 4);
    ctx.lineTo(-w / 4, -4);
    ctx.lineTo(0, -4);
    ctx.lineTo(0, 4);
    ctx.lineTo(w / 4, 4);
    ctx.lineTo(w / 4, -4);
    ctx.stroke();
}

function drawConstHigh(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#DCFCE7';
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#166534';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', 0, 0);
}

function drawConstLow(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#F3F4F6';
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', 0, 0);
}

function drawFlipFlop(ctx: CanvasRenderingContext2D, w: number, h: number, type: string) {
    ctx.fillStyle = '#e8e8f0';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = type === 'D_FLIPFLOP' ? 'D-FF' : type === 'SR_LATCH' ? 'SR' : type === 'JK_FLIPFLOP' ? 'JK' : 'T';
    ctx.fillText(label, 0, 0);
}

function drawCounter(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#dbeafe';
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CNT', 0, -4);
    ctx.font = '7px sans-serif';
    ctx.fillText('0→F', 0, 6);
}

function drawShiftRegister(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHIFT', 0, 0);
}

function draw7Segment(ctx: CanvasRenderingContext2D, w: number, h: number, segments: Record<string, boolean> = {}) {
    ctx.fillStyle = '#1f2937';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    ctx.fill();
    ctx.stroke();
    
    // 7-segment layout:
    //   AAA
    //  F   B
    //   GGG
    //  E   C
    //   DDD
    const segW = 10, segH = 3;
    const cx = 0, cy = 0;
    const offColor = '#374151';
    const onColor = '#22C55E';
    
    // Segment A (top horizontal)
    ctx.fillStyle = segments['A'] ? onColor : offColor;
    ctx.fillRect(cx - segW/2, cy - 12, segW, segH);
    
    // Segment B (top right vertical)
    ctx.fillStyle = segments['B'] ? onColor : offColor;
    ctx.fillRect(cx + segW/2 - 1, cy - 12, segH, segW);
    
    // Segment C (bottom right vertical)
    ctx.fillStyle = segments['C'] ? onColor : offColor;
    ctx.fillRect(cx + segW/2 - 1, cy + 2, segH, segW);
    
    // Segment D (bottom horizontal)
    ctx.fillStyle = segments['D'] ? onColor : offColor;
    ctx.fillRect(cx - segW/2, cy + 10, segW, segH);
    
    // Segment E (bottom left vertical)
    ctx.fillStyle = segments['E'] ? onColor : offColor;
    ctx.fillRect(cx - segW/2 - 2, cy + 2, segH, segW);
    
    // Segment F (top left vertical)
    ctx.fillStyle = segments['F'] ? onColor : offColor;
    ctx.fillRect(cx - segW/2 - 2, cy - 12, segH, segW);
    
    // Segment G (middle horizontal)
    ctx.fillStyle = segments['G'] ? onColor : offColor;
    ctx.fillRect(cx - segW/2, cy - 1, segW, segH);
}

function drawMux(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#e8e8f0';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 3, -h / 2 + 4);
    ctx.lineTo(w / 3, -h / 3);
    ctx.lineTo(w / 3, h / 3);
    ctx.lineTo(-w / 3, h / 2 - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MUX', 0, 0);
}

function drawDecoder(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#e8e8f0';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 3, -h / 3);
    ctx.lineTo(w / 3, -h / 2 + 4);
    ctx.lineTo(w / 3, h / 2 - 4);
    ctx.lineTo(-w / 3, h / 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DEC', 0, 0);
}

function drawVcc(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h / 4);
    ctx.lineTo(0, -h / 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 3, -h / 4);
    ctx.lineTo(w / 3, -h / 4);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VCC', 0, h / 3);
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -h / 4);
    ctx.lineTo(0, 0);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
        const lw = w / 3 - i * 6;
        ctx.beginPath();
        ctx.moveTo(-lw / 2, i * 4);
        ctx.lineTo(lw / 2, i * 4);
        ctx.stroke();
    }
}

function drawResistor(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, 0);
    ctx.lineTo(-w / 4, 0);
    // Zigzag
    const steps = 4;
    const stepW = w / 2 / steps;
    for (let i = 0; i < steps; i++) {
        const x = -w / 4 + i * stepW;
        ctx.lineTo(x + stepW / 2, i % 2 === 0 ? -h / 4 : h / 4);
    }
    ctx.lineTo(w / 4, 0);
    ctx.lineTo(w / 2 - 4, 0);
    ctx.stroke();
}

function drawCapacitor(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, 0);
    ctx.lineTo(-4, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -h / 3);
    ctx.lineTo(-4, h / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -h / 3);
    ctx.lineTo(4, h / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(w / 2 - 4, 0);
    ctx.stroke();
}

function drawDiode(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#e8e8f0';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 4, -h / 3);
    ctx.lineTo(w / 4, 0);
    ctx.lineTo(-w / 4, h / 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 4, -h / 3);
    ctx.lineTo(w / 4, h / 3);
    ctx.stroke();
}

function drawJunction(ctx: CanvasRenderingContext2D, _w: number, _h: number) {
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
}

function drawProbe(ctx: CanvasRenderingContext2D, w: number, h: number, isHigh: boolean) {
    ctx.fillStyle = isHigh ? '#22C55E' : '#374151';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(w, h) / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function drawMotor(ctx: CanvasRenderingContext2D, w: number, h: number, fwdActive: boolean, revActive: boolean) {
    const isRunning = fwdActive || revActive;
    const direction = fwdActive ? 1 : (revActive ? -1 : 0);
    
    // Motor body (circle)
    ctx.fillStyle = isRunning ? '#1E40AF' : '#374151';
    ctx.strokeStyle = isRunning ? '#3B82F6' : '#6B7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(w, h) / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Inner circle
    ctx.fillStyle = isRunning ? '#3B82F6' : '#4B5563';
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(w, h) / 4, 0, Math.PI * 2);
    ctx.fill();
    
    // "M" label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', 0, 0);
    
    // Direction arrow (when running)
    if (isRunning) {
        ctx.strokeStyle = '#22C55E';
        ctx.lineWidth = 2;
        const r = Math.min(w, h) / 2 - 8;
        
        // Draw rotating arrow
        ctx.beginPath();
        if (direction > 0) {
            // Clockwise arrow (FWD)
            ctx.arc(0, 0, r, -Math.PI/4, Math.PI/4);
            // Arrow head
            const endX = r * Math.cos(Math.PI/4);
            const endY = r * Math.sin(Math.PI/4);
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - 6, endY - 2);
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - 2, endY - 6);
        } else {
            // Counter-clockwise arrow (REV)
            ctx.arc(0, 0, r, Math.PI - Math.PI/4, Math.PI + Math.PI/4);
            // Arrow head
            const endX = r * Math.cos(Math.PI + Math.PI/4);
            const endY = r * Math.sin(Math.PI + Math.PI/4);
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX + 6, endY + 2);
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX + 2, endY + 6);
        }
        ctx.stroke();
        
        // Status text
        ctx.fillStyle = '#22C55E';
        ctx.font = '8px sans-serif';
        ctx.fillText(direction > 0 ? 'FWD' : 'REV', 0, h/2 + 20);
    }
}

function drawBuzzer(ctx: CanvasRenderingContext2D, w: number, h: number, isActive: boolean) {
    // Buzzer body
    ctx.fillStyle = isActive ? '#F59E0B' : '#374151';
    ctx.strokeStyle = isActive ? '#FBBF24' : '#6B7280';
    ctx.lineWidth = 2;
    
    // Draw speaker shape
    const size = Math.min(w, h) / 2 - 4;
    ctx.beginPath();
    ctx.moveTo(-size/2, -size/3);
    ctx.lineTo(-size/2, size/3);
    ctx.lineTo(0, size/2);
    ctx.lineTo(size/2, size/2);
    ctx.lineTo(size/2, -size/2);
    ctx.lineTo(0, -size/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Sound waves when active
    if (isActive) {
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 1.5;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(size/2 + 4, 0, i * 4, -Math.PI/3, Math.PI/3);
            ctx.stroke();
        }
    }
}

function drawDefault(ctx: CanvasRenderingContext2D, w: number, h: number, type: string, isDarkMode: boolean) {
    ctx.fillStyle = isDarkMode ? '#3a3a5a' : '#e8e8f0';
    ctx.strokeStyle = isDarkMode ? '#6a6a8a' : '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isDarkMode ? '#e0e0e0' : '#374151';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = type.replace(/_/g, ' ').substring(0, 8);
    ctx.fillText(label, 0, 0);
}
