'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { CircuitComponent, Wire, CircuitBlueprint } from '@/types';
import { getComponentDefinition } from '@/constants/components';
import { loadCircuitFromBlueprint } from '@/services/blueprintLoader';
import { simulationEngine, type SimulationResult } from '@/services/simulation';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { drawComponent, drawWire, drawGrid } from './drawingUtils';

interface MiniCanvasProps {
    blueprint: CircuitBlueprint;
    width?: number;
    height?: number;
}

export function MiniCanvas({ blueprint, width = 500, height = 250 }: MiniCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [components, setComponents] = useState<CircuitComponent[]>([]);
    const [wires, setWires] = useState<Wire[]>([]);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isSimulating, setIsSimulating] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const lastPanPos = useRef({ x: 0, y: 0 });

    // Load circuit from blueprint
    useEffect(() => {
        const { components: loadedComponents, wires: loadedWires } = loadCircuitFromBlueprint(blueprint);
        setComponents(loadedComponents);
        setWires(loadedWires);
        // Reset zoom/pan on new blueprint
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [blueprint]);

    // Auto-fit on initial component load
    useEffect(() => {
        if (components.length === 0) return;
        // Delay to ensure components are rendered
        const timer = setTimeout(() => {
            const xs = components.map(c => c.position.x);
            const ys = components.map(c => c.position.y);
            const minX = Math.min(...xs) - 60;
            const maxX = Math.max(...xs) + 60;
            const minY = Math.min(...ys) - 60;
            const maxY = Math.max(...ys) + 60;
            const contentWidth = maxX - minX;
            const contentHeight = maxY - minY;
            const newZoom = Math.min(width / contentWidth, height / contentHeight, 1.2);
            setZoom(newZoom);
            setPan({
                x: (width - contentWidth * newZoom) / 2 - minX * newZoom,
                y: (height - contentHeight * newZoom) / 2 - minY * newZoom,
            });
        }, 50);
        return () => clearTimeout(timer);
    }, [components.length, width, height]); // Only run when component count changes

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

    // Convert screen coordinates to canvas coordinates accounting for zoom/pan
    const screenToCanvas = useCallback((screenX: number, screenY: number) => {
        return {
            x: (screenX - pan.x) / zoom,
            y: (screenY - pan.y) / zoom,
        };
    }, [zoom, pan]);

    // Zoom controls
    const handleZoomIn = useCallback(() => setZoom(z => Math.min(z * 1.25, 3)), []);
    const handleZoomOut = useCallback(() => setZoom(z => Math.max(z / 1.25, 0.5)), []);
    const handleFitToView = useCallback(() => {
        if (components.length === 0) return;
        const xs = components.map(c => c.position.x);
        const ys = components.map(c => c.position.y);
        const minX = Math.min(...xs) - 50;
        const maxX = Math.max(...xs) + 50;
        const minY = Math.min(...ys) - 50;
        const maxY = Math.max(...ys) + 50;
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const newZoom = Math.min(width / contentWidth, height / contentHeight, 1.5);
        setZoom(newZoom);
        setPan({
            x: (width - contentWidth * newZoom) / 2 - minX * newZoom,
            y: (height - contentHeight * newZoom) / 2 - minY * newZoom,
        });
    }, [components, width, height]);

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(z => Math.min(Math.max(z * delta, 0.5), 3));
    }, []);

    // Pan handlers - allow direct drag to pan
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const { x, y } = {
            x: (screenX - pan.x) / zoom,
            y: (screenY - pan.y) / zoom,
        };
        
        // Check if clicking on a component
        let clickedOnComponent = false;
        for (const comp of components) {
            const def = getComponentDefinition(comp.type);
            const w = def?.width || 60;
            const h = def?.height || 40;
            if (x >= comp.position.x - w / 2 && x <= comp.position.x + w / 2 &&
                y >= comp.position.y - h / 2 && y <= comp.position.y + h / 2) {
                clickedOnComponent = true;
                break;
            }
        }
        
        // Pan if clicking empty space, middle click, or shift+click
        if (!clickedOnComponent || e.button === 1 || e.shiftKey) {
            setIsPanning(true);
            lastPanPos.current = { x: e.clientX, y: e.clientY };
        }
    }, [components, zoom, pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - lastPanPos.current.x;
            const dy = e.clientY - lastPanPos.current.y;
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
            lastPanPos.current = { x: e.clientX, y: e.clientY };
        }
    }, [isPanning]);

    const handlePanEnd = useCallback(() => setIsPanning(false), []);

    // Toggle switch state
    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isPanning) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const { x, y } = screenToCanvas(screenX, screenY);

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
                // Handle DIP switch - toggle individual switches within it
                if (comp.type === 'DIP_SWITCH_4') {
                    const def = getComponentDefinition(comp.type);
                    const compW = def?.width || 60;
                    // Calculate which switch was clicked (4 switches in a row)
                    const localX = x - (comp.position.x - compW / 2);
                    const switchWidth = compW / 4;
                    const switchIdx = Math.floor(localX / switchWidth);
                    if (switchIdx >= 0 && switchIdx < 4) {
                        setComponents(prev =>
                            prev.map(c =>
                                c.id === comp.id
                                    ? { ...c, properties: { ...c.properties, [`sw${switchIdx}`]: !c.properties[`sw${switchIdx}`] } }
                                    : c
                            )
                        );
                    }
                    break;
                }
                // Toggle switches
                if (comp.type === 'SWITCH_TOGGLE' || comp.type === 'SWITCH_PUSH') {
                    const wasOff = !comp.properties.state;
                    setComponents(prev => {
                        const updated = prev.map(c =>
                            c.id === comp.id
                                ? { ...c, properties: { ...c.properties, state: !c.properties.state } }
                                : c
                        );
                        
                        // If push button just turned ON (rising edge), update sequential components
                        if (comp.type === 'SWITCH_PUSH' && wasOff) {
                            // Check if this button is wired to a CLK input of a sequential component
                            const clockWire = wires.find(w => w.fromComponentId === comp.id);
                            if (clockWire) {
                                const targetComp = updated.find(c => c.id === clockWire.toComponentId);
                                const targetPin = targetComp?.pins.find(p => p.id === clockWire.toPinId);
                                if (targetComp && targetPin?.name === 'CLK') {
                                    return updated.map(c => {
                                        if (c.id === targetComp.id) {
                                            // Counter: increment count
                                            if (c.type === 'COUNTER_4BIT') {
                                                const count = ((c.properties._count as number) ?? 0);
                                                return { ...c, properties: { ...c.properties, _count: (count + 1) % 16 } };
                                            }
                                            // Shift register: shift in data bit from SI input
                                            if (c.type === 'SHIFT_REGISTER_8BIT') {
                                                const shiftValue = ((c.properties._shiftValue as number) ?? 0);
                                                // Find what's connected to SI pin
                                                const siPin = c.pins.find(p => p.name === 'SI');
                                                const siWire = siPin && wires.find(w => 
                                                    w.toComponentId === c.id && w.toPinId === siPin.id
                                                );
                                                let dataBit = 0;
                                                if (siWire) {
                                                    // Find the source component
                                                    const srcComp = updated.find(src => src.id === siWire.fromComponentId);
                                                    if (srcComp && (srcComp.type === 'SWITCH_TOGGLE' || srcComp.type === 'SWITCH_PUSH')) {
                                                        dataBit = srcComp.properties.state ? 1 : 0;
                                                    }
                                                }
                                                return { ...c, properties: { ...c.properties, _shiftValue: ((shiftValue << 1) | dataBit) & 0xFF } };
                                            }
                                        }
                                        return c;
                                    });
                                }
                            }
                        }
                        return updated;
                    });
                }
                break;
            }
        }
    }, [components, wires]);

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

        // Apply zoom and pan transformation
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        // Draw grid
        drawGrid(ctx, width / zoom, height / zoom, true);

        // Draw wires
        wires.forEach(wire => {
            const wireState = simulationResult?.wireStates[wire.id];
            drawWire(ctx, wire, components, wireState);
        });

        // Draw components
        components.forEach(comp => {
            const pinStates = simulationResult?.pinStates[comp.id] ?? {};
            drawComponent(ctx, comp, { isDarkMode: true, pinStates });
        });

        ctx.restore();

    }, [components, wires, simulationResult, width, height, zoom, pan]);

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className={`rounded-lg border border-gray-600 ${isPanning ? 'cursor-grabbing' : 'cursor-pointer'}`}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={() => { handleMouseUp(); handlePanEnd(); }}
                onMouseLeave={() => { handleMouseUp(); handlePanEnd(); }}
                onWheel={handleWheel}
            />
            {/* Zoom Controls - Top Right */}
            <div className="absolute top-2 right-2 flex gap-1">
                <button
                    onClick={handleZoomIn}
                    className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Zoom In"
                >
                    <ZoomIn className="w-3 h-3" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-3 h-3" />
                </button>
                <button
                    onClick={handleFitToView}
                    className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Fit to View"
                >
                    <Maximize2 className="w-3 h-3" />
                </button>
            </div>
            {/* Playback Controls - Bottom Right */}
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

        </div>
    );
}
