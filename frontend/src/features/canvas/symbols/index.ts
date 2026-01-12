/**
 * @file index.ts
 * @description Barrel export for all canvas symbol drawing functions
 * @module features/canvas/symbols
 */

// Base utilities
export { drawICBase, drawDefaultComponent } from './baseSymbols';

// Logic gates
export {
    drawAndGateSymbol,
    drawOrGateSymbol,
    drawXorGateSymbol,
    drawNotGateSymbol,
} from './gateSymbols';

// Input components
export {
    drawToggleSwitchSymbol,
    drawPushButtonSymbol,
    drawClockSymbol,
    drawConstHighSymbol,
    drawConstLowSymbol,
    drawDipSwitchSymbol,
    drawNumericInputSymbol,
} from './inputSymbols';

// Output components
export { drawLedSymbol, draw7SegmentSymbol, drawProbeSymbol } from './outputSymbols';

// Flip-flops
export { drawFlipFlopSymbol } from './flipflopSymbols';

// Power and ground
export { drawVccSymbol, drawGroundSymbol, drawJunctionSymbol } from './powerSymbols';

// Combinational logic
export {
    drawMuxSymbol,
    drawTrafficLightCtrlSymbol,
    drawCounterSymbol,
    drawShiftRegisterSymbol,
    drawAdderSymbol,
    drawComparatorSymbol,
    drawDecoderSymbol,
} from './combinationalSymbols';

// Passive components
export { drawResistorSymbol, drawCapacitorSymbol, drawDiodeSymbol } from './passiveSymbols';
