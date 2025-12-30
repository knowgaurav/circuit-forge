/**
 * Detailed component information for tooltips and modal views
 * Includes descriptions, truth tables, and usage examples
 */

export interface TruthTableRow {
    inputs: string[];
    outputs: string[];
}

export interface ComponentDetail {
    type: string;
    shortDescription: string;
    fullDescription: string;
    truthTable?: {
        inputLabels: string[];
        outputLabels: string[];
        rows: TruthTableRow[];
    };
    usageExample?: string;
    tips?: string[];
    relatedComponents?: string[];
}

export const COMPONENT_DETAILS: Record<string, ComponentDetail> = {
    // Logic Gates
    AND_2: {
        type: 'AND_2',
        shortDescription: 'Output is HIGH only when ALL inputs are HIGH',
        fullDescription: 'The AND gate performs logical conjunction. It outputs a HIGH (1) signal only when all of its inputs are HIGH. If any input is LOW (0), the output will be LOW. AND gates are fundamental building blocks in digital circuits, used for enabling signals, creating conditions, and implementing Boolean AND operations.',
        truthTable: {
            inputLabels: ['A', 'B'],
            outputLabels: ['Y'],
            rows: [
                { inputs: ['0', '0'], outputs: ['0'] },
                { inputs: ['0', '1'], outputs: ['0'] },
                { inputs: ['1', '0'], outputs: ['0'] },
                { inputs: ['1', '1'], outputs: ['1'] },
            ]
        },
        usageExample: 'Use AND gates to create enable conditions. For example, a motor runs only when the power switch AND the safety switch are both ON.',
        tips: ['All inputs must be HIGH for output to be HIGH', 'Use for "all conditions must be true" logic'],
        relatedComponents: ['NAND_2', 'OR_2', 'NOT']
    },
    OR_2: {
        type: 'OR_2',
        shortDescription: 'Output is HIGH when ANY input is HIGH',
        fullDescription: 'The OR gate performs logical disjunction. It outputs a HIGH (1) signal when at least one of its inputs is HIGH. The output is LOW only when all inputs are LOW. OR gates are used for combining multiple trigger conditions or creating "any of these" logic.',
        truthTable: {
            inputLabels: ['A', 'B'],
            outputLabels: ['Y'],
            rows: [
                { inputs: ['0', '0'], outputs: ['0'] },
                { inputs: ['0', '1'], outputs: ['1'] },
                { inputs: ['1', '0'], outputs: ['1'] },
                { inputs: ['1', '1'], outputs: ['1'] },
            ]
        },
        usageExample: 'Use OR gates to trigger an alarm when any sensor detects motion (Sensor1 OR Sensor2 OR Sensor3).',
        tips: ['Any HIGH input makes output HIGH', 'Use for "at least one condition true" logic'],
        relatedComponents: ['NOR_2', 'AND_2', 'XOR_2']
    },
    NOT: {
        type: 'NOT',
        shortDescription: 'Inverts the input signal (HIGH→LOW, LOW→HIGH)',
        fullDescription: 'The NOT gate (inverter) performs logical negation. It has a single input and outputs the opposite value. If the input is HIGH, the output is LOW, and vice versa. Inverters are essential for creating complementary signals and implementing negative logic.',
        truthTable: {
            inputLabels: ['A'],
            outputLabels: ['Y'],
            rows: [
                { inputs: ['0'], outputs: ['1'] },
                { inputs: ['1'], outputs: ['0'] },
            ]
        },
        usageExample: 'Create an "active-low" enable signal by inverting a switch output.',
        tips: ['Output is always opposite of input', 'The small circle (bubble) indicates inversion'],
        relatedComponents: ['BUFFER', 'NAND_2', 'NOR_2']
    },
    NAND_2: {
        type: 'NAND_2',
        shortDescription: 'NOT-AND: Output is LOW only when ALL inputs are HIGH',
        fullDescription: 'The NAND gate is an AND gate followed by a NOT gate. It outputs LOW only when all inputs are HIGH. NAND is a "universal gate" - any digital circuit can be built using only NAND gates. This makes it fundamental in IC design.',
        truthTable: {
            inputLabels: ['A', 'B'],
            outputLabels: ['Y'],
            rows: [
                { inputs: ['0', '0'], outputs: ['1'] },
                { inputs: ['0', '1'], outputs: ['1'] },
                { inputs: ['1', '0'], outputs: ['1'] },
                { inputs: ['1', '1'], outputs: ['0'] },
            ]
        },
        usageExample: 'Build any logic circuit using only NAND gates. Two NANDs with tied inputs = NOT gate.',
        tips: ['Universal gate - can implement any logic function', 'Output is inverse of AND gate'],
        relatedComponents: ['AND_2', 'NOR_2', 'NOT']
    },
    NOR_2: {
        type: 'NOR_2',
        shortDescription: 'NOT-OR: Output is HIGH only when ALL inputs are LOW',
        fullDescription: 'The NOR gate is an OR gate followed by a NOT gate. It outputs HIGH only when all inputs are LOW. Like NAND, NOR is also a "universal gate" - any digital circuit can be built using only NOR gates.',
        truthTable: {
            inputLabels: ['A', 'B'],
            outputLabels: ['Y'],
            rows: [
                { inputs: ['0', '0'], outputs: ['1'] },
                { inputs: ['0', '1'], outputs: ['0'] },
                { inputs: ['1', '0'], outputs: ['0'] },
                { inputs: ['1', '1'], outputs: ['0'] },
            ]
        },
        usageExample: 'Use NOR gates to detect when all inputs are inactive (all sensors OFF).',
        tips: ['Universal gate - can implement any logic function', 'Output is inverse of OR gate'],
        relatedComponents: ['OR_2', 'NAND_2', 'NOT']
    },
    XOR_2: {
        type: 'XOR_2',
        shortDescription: 'Exclusive OR: Output is HIGH when inputs are DIFFERENT',
        fullDescription: 'The XOR (Exclusive OR) gate outputs HIGH when the inputs are different (one HIGH, one LOW). It outputs LOW when both inputs are the same. XOR is used for comparisons, parity checking, and arithmetic operations.',
        truthTable: {
            inputLabels: ['A', 'B'],
            outputLabels: ['Y'],
            rows: [
                { inputs: ['0', '0'], outputs: ['0'] },
                { inputs: ['0', '1'], outputs: ['1'] },
                { inputs: ['1', '0'], outputs: ['1'] },
                { inputs: ['1', '1'], outputs: ['0'] },
            ]
        },
        usageExample: 'Use XOR for single-bit addition (half adder) or to detect changes between two signals.',
        tips: ['Outputs HIGH when inputs differ', 'Used in adders and parity generators'],
        relatedComponents: ['XNOR_2', 'OR_2', 'ADDER_4BIT']
    },
    BUFFER: {
        type: 'BUFFER',
        shortDescription: 'Passes input to output unchanged (signal amplifier)',
        fullDescription: 'The buffer gate outputs the same value as its input. While it seems unnecessary, buffers are used to amplify weak signals, add delay, or isolate circuit sections. They restore signal levels in long wire runs.',
        truthTable: {
            inputLabels: ['A'],
            outputLabels: ['Y'],
            rows: [
                { inputs: ['0'], outputs: ['0'] },
                { inputs: ['1'], outputs: ['1'] },
            ]
        },
        usageExample: 'Use buffers to drive multiple outputs from a single source without signal degradation.',
        tips: ['Output equals input', 'Used for signal amplification and isolation'],
        relatedComponents: ['NOT']
    },

    // Input Devices
    SWITCH_TOGGLE: {
        type: 'SWITCH_TOGGLE',
        shortDescription: 'Click to toggle between HIGH and LOW states',
        fullDescription: 'A toggle switch maintains its state after being clicked. Click once to turn ON (HIGH), click again to turn OFF (LOW). Use toggle switches to represent physical on/off switches, enable controls, or mode selectors in your circuit.',
        usageExample: 'Use as a power switch or mode selector. Connect to AND gates to enable/disable circuit sections.',
        tips: ['Click to toggle state', 'State persists until clicked again', 'Green = ON, Gray = OFF'],
        relatedComponents: ['SWITCH_PUSH', 'CONST_HIGH', 'CONST_LOW']
    },
    SWITCH_PUSH: {
        type: 'SWITCH_PUSH',
        shortDescription: 'HIGH only while pressed (momentary contact)',
        fullDescription: 'A push button outputs HIGH only while being pressed. When released, it returns to LOW. This simulates momentary switches like keyboard keys or doorbell buttons. Useful for generating single pulses or reset signals.',
        usageExample: 'Use for reset buttons, manual clock pulses, or triggering one-shot events.',
        tips: ['Hold to keep HIGH', 'Releases to LOW automatically', 'Good for triggers and resets'],
        relatedComponents: ['SWITCH_TOGGLE', 'CLOCK']
    },
    CLOCK: {
        type: 'CLOCK',
        shortDescription: 'Generates alternating HIGH/LOW pulses automatically',
        fullDescription: 'The clock generator produces a continuous square wave, alternating between HIGH and LOW at a set frequency. Clocks are essential for sequential circuits like flip-flops, counters, and registers that need synchronized timing.',
        usageExample: 'Connect to flip-flop clock inputs to create counters and shift registers.',
        tips: ['Automatic oscillation', 'Essential for sequential circuits', 'Frequency can be adjusted'],
        relatedComponents: ['D_FLIPFLOP', 'COUNTER_4BIT', 'SHIFT_REGISTER_8BIT']
    },
    CONST_HIGH: {
        type: 'CONST_HIGH',
        shortDescription: 'Always outputs logic HIGH (1)',
        fullDescription: 'A constant HIGH source always outputs a logic 1. Use it to tie inputs to a permanent HIGH level, create pull-up connections, or provide a reference voltage. Essential for setting default states.',
        usageExample: 'Connect to unused inputs that need to be held HIGH, or create enable signals.',
        tips: ['Always outputs 1', 'Use for pull-up or default HIGH inputs'],
        relatedComponents: ['CONST_LOW', 'VCC_5V']
    },
    CONST_LOW: {
        type: 'CONST_LOW',
        shortDescription: 'Always outputs logic LOW (0)',
        fullDescription: 'A constant LOW source always outputs a logic 0. Use it to tie inputs to a permanent LOW level, create pull-down connections, or ground unused inputs. Essential for setting default states.',
        usageExample: 'Connect to unused inputs that need to be held LOW, or disable enable pins.',
        tips: ['Always outputs 0', 'Use for pull-down or default LOW inputs'],
        relatedComponents: ['CONST_HIGH', 'GROUND']
    },
    DIP_SWITCH_4: {
        type: 'DIP_SWITCH_4',
        shortDescription: '4 independent switches for binary input (0-15)',
        fullDescription: 'A 4-bit DIP switch provides four independent toggle switches, allowing you to input any 4-bit binary number (0-15). Each switch controls one bit. Commonly used for configuration settings and address selection.',
        usageExample: 'Set a 4-bit address or configuration value. Connect to decoder inputs or comparator.',
        tips: ['4 independent bits', 'Can represent values 0-15', 'Click individual switches to toggle'],
        relatedComponents: ['NUMERIC_INPUT', 'DECODER_2TO4']
    },
    NUMERIC_INPUT: {
        type: 'NUMERIC_INPUT',
        shortDescription: 'Enter a decimal number (converted to binary outputs)',
        fullDescription: 'The numeric input lets you enter a decimal number which is automatically converted to binary on its output pins. Easier than setting individual DIP switches when you know the decimal value you want.',
        usageExample: 'Input a specific test value for an adder or comparator.',
        tips: ['Enter decimal value', 'Automatically converts to binary', 'Range depends on bit width'],
        relatedComponents: ['DIP_SWITCH_4', 'DISPLAY_7SEG']
    },

    // Output Devices
    LED_RED: {
        type: 'LED_RED',
        shortDescription: 'Lights up red when input is HIGH',
        fullDescription: 'A red LED (Light Emitting Diode) glows when its input receives a HIGH signal. LEDs are the most common way to visualize logic states in digital circuits. Red typically indicates errors, warnings, or active states.',
        usageExample: 'Show error conditions, power-on indicators, or active warnings.',
        tips: ['Glows when input is HIGH', 'Off when input is LOW', 'Red often means warning/error'],
        relatedComponents: ['LED_GREEN', 'LED_BLUE', 'LED_YELLOW']
    },
    LED_GREEN: {
        type: 'LED_GREEN',
        shortDescription: 'Lights up green when input is HIGH',
        fullDescription: 'A green LED glows when its input receives a HIGH signal. Green typically indicates success, ready states, or normal operation. Use green LEDs to show positive conditions.',
        usageExample: 'Show success states, ready indicators, or "go" signals.',
        tips: ['Glows when input is HIGH', 'Green often means OK/ready'],
        relatedComponents: ['LED_RED', 'LED_BLUE', 'LED_YELLOW']
    },
    LED_BLUE: {
        type: 'LED_BLUE',
        shortDescription: 'Lights up blue when input is HIGH',
        fullDescription: 'A blue LED glows when its input receives a HIGH signal. Blue is often used for informational indicators, status displays, or decorative lighting.',
        usageExample: 'Show information states, communication activity, or general status.',
        tips: ['Glows when input is HIGH', 'Blue often means info/status'],
        relatedComponents: ['LED_RED', 'LED_GREEN', 'LED_YELLOW']
    },
    LED_YELLOW: {
        type: 'LED_YELLOW',
        shortDescription: 'Lights up yellow when input is HIGH',
        fullDescription: 'A yellow LED glows when its input receives a HIGH signal. Yellow typically indicates caution, pending states, or attention needed.',
        usageExample: 'Show warning states, busy indicators, or attention signals.',
        tips: ['Glows when input is HIGH', 'Yellow often means caution/pending'],
        relatedComponents: ['LED_RED', 'LED_GREEN', 'LED_BLUE']
    },
    DISPLAY_7SEG: {
        type: 'DISPLAY_7SEG',
        shortDescription: 'Shows digits 0-9 based on 4-bit BCD input',
        fullDescription: 'The 7-segment display shows decimal digits (0-9) based on a 4-bit BCD (Binary Coded Decimal) input. Seven LED segments are arranged to display numbers. Connect counter or adder outputs to visualize numeric values.',
        usageExample: 'Display counter values, calculator results, or any numeric output.',
        tips: ['Input is 4-bit BCD (0-9)', 'Values above 9 may show invalid symbols', 'Great for visualizing numbers'],
        relatedComponents: ['COUNTER_4BIT', 'ADDER_4BIT', 'NUMERIC_INPUT']
    },

    // Flip-Flops
    D_FLIPFLOP: {
        type: 'D_FLIPFLOP',
        shortDescription: 'Stores 1 bit; Q follows D on clock edge',
        fullDescription: 'The D flip-flop captures the D input value on the rising edge of the clock and holds it at Q. Q\' is the inverse of Q. It\'s the fundamental building block for registers, counters, and memory. "D" stands for "Data" or "Delay".',
        truthTable: {
            inputLabels: ['CLK', 'D'],
            outputLabels: ['Q', "Q'"],
            rows: [
                { inputs: ['↑', '0'], outputs: ['0', '1'] },
                { inputs: ['↑', '1'], outputs: ['1', '0'] },
                { inputs: ['0/1', 'X'], outputs: ['Q₀', "Q₀'"] },
            ]
        },
        usageExample: 'Chain multiple D flip-flops to create a shift register. Connect Q to next D.',
        tips: ['Captures D on rising clock edge', 'Q holds value between clock edges', '↑ means rising edge'],
        relatedComponents: ['SR_LATCH', 'JK_FLIPFLOP', 'COUNTER_4BIT']
    },
    SR_LATCH: {
        type: 'SR_LATCH',
        shortDescription: 'Set-Reset latch: S=1 sets Q, R=1 resets Q',
        fullDescription: 'The SR latch has two inputs: Set (S) and Reset (R). Setting S=1 makes Q=1. Setting R=1 makes Q=0. Both inputs at 0 holds the previous state. S=R=1 is an invalid state that should be avoided.',
        truthTable: {
            inputLabels: ['S', 'R'],
            outputLabels: ['Q', "Q'"],
            rows: [
                { inputs: ['0', '0'], outputs: ['Q₀', "Q₀'"] },
                { inputs: ['0', '1'], outputs: ['0', '1'] },
                { inputs: ['1', '0'], outputs: ['1', '0'] },
                { inputs: ['1', '1'], outputs: ['?', '?'] },
            ]
        },
        usageExample: 'Use for debouncing mechanical switches or simple state storage.',
        tips: ['S=1 sets Q to 1', 'R=1 resets Q to 0', 'Avoid S=R=1 (invalid)'],
        relatedComponents: ['D_FLIPFLOP', 'JK_FLIPFLOP']
    },
    JK_FLIPFLOP: {
        type: 'JK_FLIPFLOP',
        shortDescription: 'J sets, K resets, J=K=1 toggles Q',
        fullDescription: 'The JK flip-flop improves on the SR latch by defining the J=K=1 case: it toggles Q. J acts like Set, K acts like Reset. J=K=1 causes Q to toggle (flip) on each clock edge, useful for counters.',
        truthTable: {
            inputLabels: ['CLK', 'J', 'K'],
            outputLabels: ['Q'],
            rows: [
                { inputs: ['↑', '0', '0'], outputs: ['Q₀'] },
                { inputs: ['↑', '0', '1'], outputs: ['0'] },
                { inputs: ['↑', '1', '0'], outputs: ['1'] },
                { inputs: ['↑', '1', '1'], outputs: ['Toggle'] },
            ]
        },
        usageExample: 'Build a counter by connecting Q\' to J and K (toggle mode).',
        tips: ['J=1, K=0 → Set', 'J=0, K=1 → Reset', 'J=K=1 → Toggle'],
        relatedComponents: ['D_FLIPFLOP', 'SR_LATCH', 'COUNTER_4BIT']
    },

    // Combinational
    MUX_2TO1: {
        type: 'MUX_2TO1',
        shortDescription: 'Select between 2 inputs based on select line',
        fullDescription: 'A 2-to-1 multiplexer (MUX) selects one of two data inputs to pass to the output, based on a select signal. When SEL=0, input A passes through. When SEL=1, input B passes through. Think of it as a data switch.',
        truthTable: {
            inputLabels: ['SEL', 'A', 'B'],
            outputLabels: ['Y'],
            rows: [
                { inputs: ['0', 'X', '-'], outputs: ['A'] },
                { inputs: ['1', '-', 'X'], outputs: ['B'] },
            ]
        },
        usageExample: 'Switch between two data sources, like selecting between manual and automatic control.',
        tips: ['SEL=0 selects input A', 'SEL=1 selects input B', 'Like a data switch'],
        relatedComponents: ['DECODER_2TO4']
    },
    DECODER_2TO4: {
        type: 'DECODER_2TO4',
        shortDescription: '2 inputs select which of 4 outputs goes HIGH',
        fullDescription: 'A 2-to-4 decoder takes a 2-bit binary input and activates one of four outputs. The input value (0-3) determines which output line is HIGH. Used for address decoding, memory selection, and demultiplexing.',
        truthTable: {
            inputLabels: ['A₁', 'A₀'],
            outputLabels: ['Y₀', 'Y₁', 'Y₂', 'Y₃'],
            rows: [
                { inputs: ['0', '0'], outputs: ['1', '0', '0', '0'] },
                { inputs: ['0', '1'], outputs: ['0', '1', '0', '0'] },
                { inputs: ['1', '0'], outputs: ['0', '0', '1', '0'] },
                { inputs: ['1', '1'], outputs: ['0', '0', '0', '1'] },
            ]
        },
        usageExample: 'Select one of four devices based on a 2-bit address.',
        tips: ['Only one output is HIGH at a time', 'Input binary value selects output'],
        relatedComponents: ['MUX_2TO1', 'DIP_SWITCH_4']
    },
    ADDER_4BIT: {
        type: 'ADDER_4BIT',
        shortDescription: 'Adds two 4-bit numbers, outputs sum and carry',
        fullDescription: 'The 4-bit adder performs binary addition of two 4-bit numbers (A and B), producing a 4-bit sum and a carry output. Can add numbers from 0-15. Chain multiple adders for larger bit widths.',
        usageExample: 'Build a simple calculator by connecting to numeric inputs and 7-segment display.',
        tips: ['Adds A + B', 'Carry out indicates overflow', 'Sum is 4 bits (0-15)'],
        relatedComponents: ['DISPLAY_7SEG', 'NUMERIC_INPUT', 'COMPARATOR_4BIT']
    },
    COMPARATOR_4BIT: {
        type: 'COMPARATOR_4BIT',
        shortDescription: 'Compares two 4-bit numbers: A<B, A=B, A>B',
        fullDescription: 'The 4-bit comparator compares two 4-bit binary numbers and outputs which comparison is true: A less than B, A equal to B, or A greater than B. One and only one output is HIGH.',
        usageExample: 'Compare a sensor value to a threshold to trigger an action.',
        tips: ['Exactly one output is HIGH', 'A<B, A=B, or A>B', 'Useful for conditional logic'],
        relatedComponents: ['ADDER_4BIT', 'NUMERIC_INPUT']
    },

    // Sequential
    COUNTER_4BIT: {
        type: 'COUNTER_4BIT',
        shortDescription: 'Counts from 0-15, increments on each clock pulse',
        fullDescription: 'The 4-bit counter increments its binary output on each rising edge of the clock. It counts from 0 to 15 (0000 to 1111) and wraps back to 0. Has a reset input to return to 0.',
        usageExample: 'Count events, generate timing sequences, or create a digital clock.',
        tips: ['Counts 0→15→0→...', 'Reset forces count to 0', 'Clock edge triggers increment'],
        relatedComponents: ['CLOCK', 'D_FLIPFLOP', 'DISPLAY_7SEG']
    },
    SHIFT_REGISTER_8BIT: {
        type: 'SHIFT_REGISTER_8BIT',
        shortDescription: 'Serial input shifts through 8 parallel outputs',
        fullDescription: 'The 8-bit shift register accepts serial data (one bit at a time) and shifts it through 8 output positions on each clock pulse. Used for serial-to-parallel conversion, delays, and LED patterns.',
        usageExample: 'Create running LED patterns or convert serial data to parallel.',
        tips: ['Data enters at serial input', 'Shifts right on each clock', '8 parallel outputs available'],
        relatedComponents: ['CLOCK', 'D_FLIPFLOP', 'LED_RED']
    },

    // Passive Components
    RESISTOR: {
        type: 'RESISTOR',
        shortDescription: 'Limits current flow in a circuit',
        fullDescription: 'A resistor opposes the flow of electric current. In digital circuits, resistors are used for current limiting (protecting LEDs), pull-up/pull-down configurations, and voltage dividers.',
        usageExample: 'Add in series with an LED to limit current and prevent burnout.',
        tips: ['Higher resistance = less current', 'Essential for LED circuits', 'Used for pull-up/pull-down'],
        relatedComponents: ['LED_RED', 'CAPACITOR', 'DIODE']
    },
    CAPACITOR: {
        type: 'CAPACITOR',
        shortDescription: 'Stores charge, filters noise, smooths signals',
        fullDescription: 'A capacitor stores electrical charge. In digital circuits, capacitors filter power supply noise, debounce switches, and create RC timing circuits. They block DC while passing AC signals.',
        usageExample: 'Add across power rails to filter noise (decoupling capacitor).',
        tips: ['Blocks DC, passes AC', 'Filters noise', 'Used in timing circuits'],
        relatedComponents: ['RESISTOR', 'CLOCK']
    },
    DIODE: {
        type: 'DIODE',
        shortDescription: 'Allows current in one direction only',
        fullDescription: 'A diode conducts current in only one direction (anode to cathode). Used for protection against reverse polarity, signal rectification, and creating logic OR gates with diode logic.',
        usageExample: 'Protect circuits from reverse battery connection.',
        tips: ['Current flows anode → cathode', 'Blocks reverse current', 'Creates diode OR logic'],
        relatedComponents: ['LED_RED', 'RESISTOR']
    },

    // Power
    VCC_5V: {
        type: 'VCC_5V',
        shortDescription: '+5V power supply rail',
        fullDescription: 'A +5V power supply connection. In digital circuits, 5V typically represents logic HIGH. Connect to components that need a 5V reference or power source.',
        tips: ['Standard TTL logic level', '5V = logic HIGH'],
        relatedComponents: ['GROUND', 'VCC_3V3', 'CONST_HIGH']
    },
    VCC_3V3: {
        type: 'VCC_3V3',
        shortDescription: '+3.3V power supply rail',
        fullDescription: 'A +3.3V power supply connection. Many modern digital circuits use 3.3V logic levels. Connect to components designed for 3.3V operation.',
        tips: ['Common in modern ICs', '3.3V = logic HIGH'],
        relatedComponents: ['GROUND', 'VCC_5V', 'CONST_HIGH']
    },
    GROUND: {
        type: 'GROUND',
        shortDescription: '0V reference (ground)',
        fullDescription: 'Ground (0V) is the reference point for all voltages in a circuit. All voltage measurements are relative to ground. Connect the negative side of power supplies and logic LOW references to ground.',
        tips: ['0V reference', 'Logic LOW reference'],
        relatedComponents: ['VCC_5V', 'CONST_LOW']
    },

    // Connectors
    JUNCTION: {
        type: 'JUNCTION',
        shortDescription: 'Wire junction - connects multiple wires',
        fullDescription: 'A junction point where multiple wires connect electrically. Use junctions to branch a signal to multiple destinations or combine wires at a common point.',
        tips: ['All connected wires share the same signal', 'Use to branch signals'],
        relatedComponents: ['PROBE']
    },
    PROBE: {
        type: 'PROBE',
        shortDescription: 'Signal probe for debugging (shows HIGH/LOW)',
        fullDescription: 'A probe displays the current logic state of a wire. Connect it to any point in your circuit to observe whether the signal is HIGH or LOW. Essential for debugging.',
        tips: ['Shows current logic state', 'Great for debugging', 'Does not affect circuit'],
        relatedComponents: ['JUNCTION', 'LED_RED']
    },
};

// Helper to get detail by component type
export function getComponentDetail(type: string): ComponentDetail | undefined {
    return COMPONENT_DETAILS[type];
}
