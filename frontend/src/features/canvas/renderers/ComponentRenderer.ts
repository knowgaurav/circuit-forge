/**
 * @file ComponentRenderer.ts
 * @description Pure functions for drawing circuit components and their pins
 * @module features/canvas/renderers
 */

import {
    // Base utilities
    drawDefaultComponent,
    // Logic gates
    drawAndGateSymbol,
    drawOrGateSymbol,
    drawXorGateSymbol,
    drawNotGateSymbol,
    // Input components
    drawToggleSwitchSymbol,
    drawPushButtonSymbol,
    drawClockSymbol,
    drawConstHighSymbol,
    drawConstLowSymbol,
    drawDipSwitchSymbol,
    drawNumericInputSymbol,
    // Output components
    drawLedSymbol,
    draw7SegmentSymbol,
    drawProbeSymbol,
    // Flip-flops
    drawFlipFlopSymbol,
    // Power and ground
    drawVccSymbol,
    drawGroundSymbol,
    drawJunctionSymbol,
    // Combinational logic
    drawMuxSymbol,
    drawTrafficLightCtrlSymbol,
    drawCounterSymbol,
    drawShiftRegisterSymbol,
    drawAdderSymbol,
    drawComparatorSymbol,
    drawDecoderSymbol,
    // Passive components
    drawResistorSymbol,
    drawCapacitorSymbol,
    drawDiodeSymbol,
} from '@/features/canvas/symbols';

import { getComponentDefinition } from '@/constants/components';

import type { SignalState } from '@/features/simulation';
import type { CircuitComponent, Pin } from '@/types';

/**
 * Draws a complete circuit component including its symbol, pins, and label.
 */
export function drawComponent(
    ctx: CanvasRenderingContext2D,
    component: CircuitComponent,
    isSelected: boolean,
    remoteSelectionParticipantId?: string,
    showPinHighlight = false,
    isDarkMode = false,
    pinStates?: Record<string, SignalState>
): void {
    const { position, type, label } = component;
    const def = getComponentDefinition(type);
    const width = def?.width || 60;
    const height = def?.height || 40;

    ctx.save();
    ctx.translate(position.x, position.y);

    // Selection highlight
    if (isSelected || remoteSelectionParticipantId) {
        ctx.strokeStyle = isSelected ? '#3B82F6' : '#F59E0B';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8);
        ctx.setLineDash([]);
    }

    // Get the input signal state for output devices (LEDs, etc.)
    let inputSignalState: SignalState | undefined;
    if (pinStates) {
        const inputPin = component.pins.find((p) => p.type === 'input');
        if (inputPin) {
            inputSignalState = pinStates[inputPin.id];
        }
    }

    // Draw component based on type
    drawComponentSymbol(
        ctx,
        type,
        width,
        height,
        isDarkMode,
        inputSignalState,
        component.properties
    );

    // Draw component label below the component
    if (label) {
        ctx.fillStyle = isDarkMode ? '#e0e0e0' : '#1F2937';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // Draw label background for better readability
        const labelWidth = ctx.measureText(label).width + 6;
        ctx.fillStyle = isDarkMode ? 'rgba(50, 50, 70, 0.95)' : 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(-labelWidth / 2, height / 2 + 4, labelWidth, 14);
        ctx.strokeStyle = isDarkMode ? '#5a5a7a' : '#D1D5DB';
        ctx.lineWidth = 1;
        ctx.strokeRect(-labelWidth / 2, height / 2 + 4, labelWidth, 14);
        // Draw label text
        ctx.fillStyle = isDarkMode ? '#e0e0e0' : '#1F2937';
        ctx.fillText(label, 0, height / 2 + 6);
    }

    ctx.restore();

    // Draw pins
    drawPins(ctx, component.pins, position, showPinHighlight, isDarkMode);
}

/**
 * Draws the pins for a component.
 */
function drawPins(
    ctx: CanvasRenderingContext2D,
    pins: Pin[],
    position: { x: number; y: number },
    showPinHighlight: boolean,
    isDarkMode: boolean
): void {
    pins.forEach((pin) => {
        const pinX = position.x + pin.position.x;
        const pinY = position.y + pin.position.y;

        // Pin connection line
        ctx.strokeStyle = isDarkMode ? '#8a8aa0' : '#374151';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (pin.type === 'input') {
            ctx.moveTo(pinX, pinY);
            ctx.lineTo(pinX + 8, pinY);
        } else {
            ctx.moveTo(pinX - 8, pinY);
            ctx.lineTo(pinX, pinY);
        }
        ctx.stroke();

        // Pin circle
        ctx.fillStyle = pin.type === 'input' ? '#22C55E' : '#EF4444';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        if (showPinHighlight) {
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pinX, pinY, 7, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(pinX, pinY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
}

/**
 * Draws the symbol for a component based on its type.
 */
export function drawComponentSymbol(
    ctx: CanvasRenderingContext2D,
    type: string,
    width: number,
    height: number,
    isDarkMode = false,
    signalState?: SignalState,
    properties?: Record<string, unknown>
): void {
    // Use lighter colors for dark mode so components are visible
    ctx.fillStyle = isDarkMode ? '#e8e8f0' : '#FFFFFF';
    ctx.strokeStyle = isDarkMode ? '#2a2a40' : '#1F2937';
    ctx.lineWidth = 2;

    // Logic Gates
    if (type.startsWith('AND') || type.startsWith('NAND')) {
        drawAndGateSymbol(ctx, width, height, type.startsWith('NAND'));
    } else if (type.startsWith('OR') || type.startsWith('NOR')) {
        drawOrGateSymbol(ctx, width, height, type.startsWith('NOR'));
    } else if (type === 'NOT' || type === 'BUFFER') {
        drawNotGateSymbol(ctx, width, height, type === 'NOT');
    } else if (type.startsWith('XOR') || type.startsWith('XNOR')) {
        drawXorGateSymbol(ctx, width, height, type.startsWith('XNOR'));
    }
    // Input Devices
    else if (type === 'SWITCH_TOGGLE') {
        const isOn = properties?.state === true;
        drawToggleSwitchSymbol(ctx, width, height, isOn);
    } else if (type === 'SWITCH_PUSH') {
        const isPressed = properties?.state === true || properties?.pressed === true;
        drawPushButtonSymbol(ctx, width, height, isPressed);
    } else if (type === 'CLOCK') {
        drawClockSymbol(ctx, width, height);
    } else if (type === 'CONST_HIGH') {
        drawConstHighSymbol(ctx, width, height);
    } else if (type === 'CONST_LOW') {
        drawConstLowSymbol(ctx, width, height);
    }
    // Output Devices
    else if (type.startsWith('LED_')) {
        const color =
            type === 'LED_RED'
                ? '#EF4444'
                : type === 'LED_GREEN'
                  ? '#22C55E'
                  : type === 'LED_BLUE'
                    ? '#3B82F6'
                    : '#FBBF24';
        const isLit = signalState === 'HIGH';
        drawLedSymbol(ctx, width, height, color, isLit);
    } else if (type === 'DISPLAY_7SEG') {
        draw7SegmentSymbol(ctx, width, height);
    }
    // Flip-Flops
    else if (type === 'D_FLIPFLOP' || type === 'SR_LATCH' || type === 'JK_FLIPFLOP') {
        drawFlipFlopSymbol(ctx, width, height, type);
    }
    // Power
    else if (type === 'VCC_5V' || type === 'VCC_3V3') {
        drawVccSymbol(ctx, width, height);
    } else if (type === 'GROUND') {
        drawGroundSymbol(ctx, width, height);
    }
    // Combinational
    else if (type === 'MUX_2TO1') {
        drawMuxSymbol(ctx, width, height);
    }
    // Sequential Controllers
    else if (type === 'TRAFFIC_LIGHT_CTRL') {
        drawTrafficLightCtrlSymbol(ctx, width, height);
    }
    // Connectors
    else if (type === 'JUNCTION') {
        drawJunctionSymbol(ctx, width, height);
    } else if (type === 'PROBE') {
        const isHigh = signalState === 'HIGH';
        drawProbeSymbol(ctx, width, height, isHigh);
    }
    // Passive Components
    else if (type === 'RESISTOR') {
        drawResistorSymbol(ctx, width, height);
    } else if (type === 'CAPACITOR') {
        drawCapacitorSymbol(ctx, width, height);
    } else if (type === 'DIODE') {
        drawDiodeSymbol(ctx, width, height);
    }
    // Sequential - Counters & Registers
    else if (type === 'COUNTER_4BIT') {
        drawCounterSymbol(ctx, width, height);
    } else if (type === 'SHIFT_REGISTER_8BIT') {
        drawShiftRegisterSymbol(ctx, width, height);
    } else if (type === 'ADDER_4BIT') {
        drawAdderSymbol(ctx, width, height);
    } else if (type === 'COMPARATOR_4BIT') {
        drawComparatorSymbol(ctx, width, height);
    } else if (type === 'DECODER_2TO4') {
        drawDecoderSymbol(ctx, width, height);
    }
    // Input devices
    else if (type === 'DIP_SWITCH_4') {
        drawDipSwitchSymbol(ctx, width, height);
    } else if (type === 'NUMERIC_INPUT') {
        drawNumericInputSymbol(ctx, width, height);
    }
    // Default styled box
    else {
        drawDefaultComponent(ctx, width, height, type, isDarkMode);
    }
}
