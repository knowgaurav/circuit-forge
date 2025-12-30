'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { CircuitComponent, Wire, CircuitBlueprint } from '@/types';
import { getComponentDefinition } from '@/constants/components';
import { loadCircuitFromBlueprint } from '@/services/blueprintLoader';
import { simulationEngine, type SimulationResult } from '@/services/simulation';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { drawComponent, drawWire, drawGrid } from './drawingUtils';

interface MiniCanvasProps {
    blueprint: CircuitBlueprint;
    width?: number;
    height?: number;
}

export function MiniCanvas({ blueprint, width = 400, height = 200 }: MiniCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [components, setComponents] = useState<CircuitComponent[]>([]);
    const [wires, setWires] = useState<Wire[]>([]);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isSimulating, setIsSimulating] = useState(true);

    // Load circuit from blueprint
    useEffect(() => {
        const { components: loadedComponents, wires: loadedWires } = loadCircuitFromBlueprint(blueprint);
        setComponents(loadedComponents);
        setWires(loadedWires);
    }, [blueprint]);

    // Run simulation whenever components change
    useEffect(() => {
        if (isSimulating && components.length > 0) {
            const circuitState = {
                sessionId: 'mini-canvas',
                version: 1,
                schemaVersion: '1.0.0',
                components,
                wires,
                annotations: [],
                updatedAt: new Date().toISOString(),
            };
            const result = simulationEngine.simulate(circuitState);
            setSimulationResult(result);
        }
    }, [components, wires, isSimulating]);

    // Simulation tick - advances clock phase for proper clock behavior
    useEffect(() => {
        if (!isSimulating) return;
        
        const hasClocks = components.some(c => c.type === 'CLOCK');
        if (!hasClocks) return;

        const interval = setInterval(() => {
            // Increment phase on clock components and update sequential logic
            setComponents(prev => {
                // Rising edge = transitioning from LOW (even) to HIGH (odd)
                // So check if current phase is even (about to become odd after increment)
                const isRisingEdge = prev.some(c => 
                    c.type === 'CLOCK' && ((c.properties.phase as number) ?? 0) % 2 === 0
                );
                
                return prev.map(c => {
                    if (c.type === 'CLOCK') {
                        return { ...c, properties: { ...c.properties, phase: ((c.properties.phase as number) ?? 0) + 1 } };
                    }
                    // Increment counter on clock rising edge
                    if (c.type === 'COUNTER_4BIT' && isRisingEdge) {
                        const count = ((c.properties._count as number) ?? 0);
                        return { ...c, properties: { ...c.properties, _count: (count + 1) % 16 } };
                    }
                    // Shift register on clock rising edge
                    if (c.type === 'SHIFT_REGISTER_8BIT' && isRisingEdge) {
                        const shiftValue = ((c.properties._shiftValue as number) ?? 0);
                        // Shift left and add input (simplified - just shift)
                        return { ...c, properties: { ...c.properties, _shiftValue: (shiftValue << 1) % 256 } };
                    }
                    return c;
                });
            });
        }, 500); // 500ms per tick = 1Hz clock

        return () => clearInterval(interval);
    }, [isSimulating, components.length]);

    // Toggle switch state
    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find clicked component
        for (const comp of components) {
            const def = getComponentDefinition(comp.type);
            const w = def?.width || 60;
            const h = def?.height || 40;

            if (
                x >= comp.position.x - w / 2 &&
                x <= comp.position.x + w / 2 &&
                y >= comp.position.y - h / 2 &&
                y <= comp.position.y + h / 2
            ) {
                // Toggle switches
                if (comp.type === 'SWITCH_TOGGLE' || comp.type === 'SWITCH_PUSH') {
                    setComponents(prev =>
                        prev.map(c =>
                            c.id === comp.id
                                ? { ...c, properties: { ...c.properties, state: !c.properties.state } }
                                : c
                        )
                    );
                }
                break;
            }
        }
    }, [components]);

    // Handle push button release
    const handleMouseUp = useCallback(() => {
        setComponents(prev =>
            prev.map(c =>
                c.type === 'SWITCH_PUSH' ? { ...c, properties: { ...c.properties, state: false } } : c
            )
        );
    }, []);

    // Reset circuit
    const handleReset = useCallback(() => {
        const { components: loadedComponents, wires: loadedWires } = loadCircuitFromBlueprint(blueprint);
        setComponents(loadedComponents);
        setWires(loadedWires);
    }, [blueprint]);

    // Render canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#1a1a28';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        drawGrid(ctx, width, height, true);

        // Draw wires
        wires.forEach(wire => {
            const wireState = simulationResult?.wireStates[wire.id];
            drawWire(ctx, wire, components, wireState);
        });

        // Draw components
        components.forEach(comp => {
            const pinStates = simulationResult?.pinStates[comp.id];
            drawComponent(ctx, comp, { isDarkMode: true, pinStates });
        });

    }, [components, wires, simulationResult, width, height]);

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="rounded-lg border border-gray-600 cursor-pointer"
                onClick={handleCanvasClick}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
            {/* Controls */}
            <div className="absolute bottom-2 right-2 flex gap-1">
                <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title={isSimulating ? 'Pause' : 'Play'}
                >
                    {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <button
                    onClick={handleReset}
                    className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Reset"
                >
                    <RotateCcw className="w-3 h-3" />
                </button>
            </div>
            {/* Hint */}
            <p className="text-xs text-gray-500 mt-1 text-center">Click switches to toggle</p>
        </div>
    );
}
