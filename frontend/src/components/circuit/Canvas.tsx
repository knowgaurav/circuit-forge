'use client';

import { useRef, useEffect, useCallback, useState, MouseEvent, DragEvent } from 'react';
import { useCircuitStore, useSessionStore, useUIStore } from '@/stores';
import type { Position, CircuitComponent, Wire, Annotation, StrokeData, Pin } from '@/types';
import { ComponentDefinition, createComponentInstance, getComponentDefinition } from '@/constants/components';
import type { SimulationResult, SignalState } from '@/services/simulation';
import { getWireStyle } from './SimulationOverlay';

interface CanvasProps {
    onComponentSelect?: (componentId: string) => void;
    onComponentMove?: (componentId: string, position: Position) => void;
    onAnnotationCreate?: (annotation: Annotation) => void;
    onComponentDrop?: (position: Position) => void;
    onComponentAdd?: (component: unknown) => void;
    onWireCreate?: (fromComponentId: string, fromPinId: string, toComponentId: string, toPinId: string) => void;
    onComponentDelete?: (componentId: string) => void;
    onWireDelete?: (wireId: string) => void;
    onComponentLabelEdit?: (componentId: string, currentLabel: string) => void;
    onSwitchToggle?: (componentId: string) => void;
    draggingComponent?: ComponentDefinition | null;
    simulationResult?: SimulationResult | null;
    isSimulationRunning?: boolean;
}

export function Canvas({
    onComponentSelect,
    onComponentMove,
    onAnnotationCreate,
    onComponentDrop,
    onComponentAdd,
    onWireCreate,
    onComponentLabelEdit,
    onSwitchToggle,
    simulationResult,
    isSimulationRunning,
}: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const components = useCircuitStore((s) => s.components);
    const wires = useCircuitStore((s) => s.wires);
    const annotations = useCircuitStore((s) => s.annotations);
    const remoteCursors = useSessionStore((s) => s.remoteCursors);
    const remoteSelections = useSessionStore((s) => s.remoteSelections);
    const currentParticipant = useSessionStore((s) => s.currentParticipant);
    const {
        selectedTool,
        selectedColor,
        strokeWidth,
        selectedComponentIds,
        zoom,
        panOffset,
        setSelectedComponentIds,
        setPanOffset,
        setZoom,
        theme,
    } = useUIStore();

    const isDarkMode = theme === 'dark';

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Position | null>(null);
    const [currentStroke, setCurrentStroke] = useState<Position[]>([]);
    const [wireStart, setWireStart] = useState<{ componentId: string; pinId: string; position: Position } | null>(null);
    const [wirePreview, setWirePreview] = useState<Position | null>(null);
    const lastClickRef = useRef<{ time: number; componentId: string | null }>({ time: 0, componentId: null });

    const screenToCanvas = useCallback((screenX: number, screenY: number): Position => {
        return {
            x: (screenX - panOffset.x) / zoom,
            y: (screenY - panOffset.y) / zoom,
        };
    }, [panOffset, zoom]);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(zoom, zoom);

        drawGrid(ctx, canvas.width, canvas.height, panOffset, zoom, isDarkMode);

        wires.forEach((wire: Wire) => {
            const wireState = simulationResult?.wireStates[wire.id];
            drawWire(ctx, wire, components, wireState);
        });

        // Draw wire preview with orthogonal routing
        if (wireStart && wirePreview) {
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const previewPath = calculateOrthogonalPath(
                wireStart.position.x, wireStart.position.y,
                wirePreview.x, wirePreview.y,
                20
            );

            ctx.beginPath();
            if (previewPath.length > 0 && previewPath[0]) {
                ctx.moveTo(previewPath[0].x, previewPath[0].y);
                for (let i = 1; i < previewPath.length; i++) {
                    const point = previewPath[i];
                    if (point) ctx.lineTo(point.x, point.y);
                }
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        components.forEach((component: CircuitComponent) => {
            const isSelected = selectedComponentIds.includes(component.id);
            let remoteSelectionId: string | undefined;
            remoteSelections.forEach((ids: string[], participantId: string) => {
                if (ids.includes(component.id)) {
                    remoteSelectionId = participantId;
                }
            });
            // Get component's input pin state for LEDs and other output devices
            const componentPinStates = simulationResult?.pinStates[component.id];
            drawComponent(ctx, component, isSelected, remoteSelectionId, selectedTool === 'wire', isDarkMode, componentPinStates);
        });

        annotations.forEach((annotation: Annotation) => {
            if (annotation.type === 'stroke') {
                drawStroke(ctx, annotation.data as StrokeData);
            }
        });

        if (currentStroke.length > 1 && currentStroke[0]) {
            ctx.beginPath();
            ctx.strokeStyle = selectedColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
            currentStroke.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
            ctx.stroke();
        }

        remoteCursors.forEach((cursor: { participantId: string; position: Position; color: string; displayName: string }) => {
            if (cursor.participantId !== currentParticipant?.id) {
                drawCursor(ctx, cursor.position, cursor.color, cursor.displayName);
            }
        });

        ctx.restore();
    }, [components, wires, annotations, selectedComponentIds, remoteCursors, remoteSelections, currentParticipant, zoom, panOffset, selectedColor, strokeWidth, currentStroke, wireStart, wirePreview, selectedTool, simulationResult, isDarkMode]);

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resizeObserver = new ResizeObserver(() => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            render();
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [render]);

    useEffect(() => {
        render();
    }, [render]);

    const findPinAtPosition = (canvasPos: Position): { component: CircuitComponent; pin: Pin } | null => {
        for (const component of components) {
            for (const pin of component.pins) {
                const pinX = component.position.x + pin.position.x;
                const pinY = component.position.y + pin.position.y;
                const dist = Math.sqrt((canvasPos.x - pinX) ** 2 + (canvasPos.y - pinY) ** 2);
                if (dist < 10) {
                    return { component, pin };
                }
            }
        }
        return null;
    };

    const findAnnotationAtPosition = useCallback((canvasPos: Position): Annotation | null => {
        const hitRadius = 10; // Distance threshold for erasing
        for (const annotation of annotations) {
            if (annotation.type === 'stroke') {
                const strokeData = annotation.data as StrokeData;
                for (const point of strokeData.points) {
                    const dist = Math.sqrt((canvasPos.x - point.x) ** 2 + (canvasPos.y - point.y) ** 2);
                    if (dist < hitRadius + strokeData.width / 2) {
                        return annotation;
                    }
                }
            }
        }
        return null;
    }, [annotations]);

    const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const canvasPos = screenToCanvas(screenPos.x, screenPos.y);

        // Check if clicking on a switch during simulation
        if (isSimulationRunning) {
            const clickedComponent = findComponentAtPosition(components, canvasPos);
            if (clickedComponent && (clickedComponent.type === 'SWITCH_TOGGLE' || clickedComponent.type === 'SWITCH_PUSH')) {
                onSwitchToggle?.(clickedComponent.id);
                return; // Don't process other interactions when toggling switch
            }
        }

        setIsDragging(true);
        setDragStart(screenPos);

        if (selectedTool === 'wire') {
            const pinHit = findPinAtPosition(canvasPos);
            if (pinHit && pinHit.pin.type === 'output') {
                const pinPos = {
                    x: pinHit.component.position.x + pinHit.pin.position.x,
                    y: pinHit.component.position.y + pinHit.pin.position.y,
                };
                setWireStart({ componentId: pinHit.component.id, pinId: pinHit.pin.id, position: pinPos });
                setWirePreview(canvasPos);
            }
        } else if (selectedTool === 'erase') {
            // Erase annotation at click position
            const annotation = findAnnotationAtPosition(canvasPos);
            if (annotation) {
                useCircuitStore.getState().deleteAnnotation(annotation.id);
            }
        } else if (selectedTool === 'select') {
            const clickedComponent = findComponentAtPosition(components, canvasPos);
            if (clickedComponent) {
                // Check for double-click to edit label
                const now = Date.now();
                const lastClick = lastClickRef.current;
                if (lastClick.componentId === clickedComponent.id && now - lastClick.time < 300) {
                    // Double-click detected - trigger label edit
                    onComponentLabelEdit?.(clickedComponent.id, clickedComponent.label || '');
                    lastClickRef.current = { time: 0, componentId: null };
                } else {
                    lastClickRef.current = { time: now, componentId: clickedComponent.id };
                }

                if (e.shiftKey) {
                    if (selectedComponentIds.includes(clickedComponent.id)) {
                        setSelectedComponentIds(selectedComponentIds.filter((id: string) => id !== clickedComponent.id));
                    } else {
                        setSelectedComponentIds([...selectedComponentIds, clickedComponent.id]);
                    }
                } else {
                    setSelectedComponentIds([clickedComponent.id]);
                }
                onComponentSelect?.(clickedComponent.id);
            } else {
                setSelectedComponentIds([]);
                lastClickRef.current = { time: 0, componentId: null };
            }
        } else if (selectedTool === 'draw') {
            setCurrentStroke([canvasPos]);
        }
    };

    const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const canvasPos = screenToCanvas(screenPos.x, screenPos.y);

        if (wireStart) {
            setWirePreview(canvasPos);
        }

        if (isDragging && dragStart) {
            if (selectedTool === 'pan') {
                const dx = screenPos.x - dragStart.x;
                const dy = screenPos.y - dragStart.y;
                setPanOffset({ x: panOffset.x + dx, y: panOffset.y + dy });
                setDragStart(screenPos);
            } else if (selectedTool === 'draw') {
                setCurrentStroke((prev) => [...prev, canvasPos]);
            } else if (selectedTool === 'erase') {
                // Erase annotations while dragging
                const annotation = findAnnotationAtPosition(canvasPos);
                if (annotation) {
                    useCircuitStore.getState().deleteAnnotation(annotation.id);
                }
            } else if (selectedTool === 'select' && selectedComponentIds.length > 0) {
                const prevCanvasPos = screenToCanvas(dragStart.x, dragStart.y);
                const dx = canvasPos.x - prevCanvasPos.x;
                const dy = canvasPos.y - prevCanvasPos.y;
                // Get fresh state and update store directly
                const store = useCircuitStore.getState();
                selectedComponentIds.forEach((id: string) => {
                    const component = store.components.find((c: CircuitComponent) => c.id === id);
                    if (component) {
                        store.moveComponent(id, { x: component.position.x + dx, y: component.position.y + dy });
                    }
                });
                setDragStart(screenPos);
            }
        }
    };

    const handleMouseUp = (e: MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const canvasPos = screenToCanvas(screenPos.x, screenPos.y);

        if (wireStart) {
            const pinHit = findPinAtPosition(canvasPos);
            if (pinHit && pinHit.pin.type === 'input' && pinHit.component.id !== wireStart.componentId) {
                onWireCreate?.(wireStart.componentId, wireStart.pinId, pinHit.component.id, pinHit.pin.id);
            }
            setWireStart(null);
            setWirePreview(null);
        }

        if (selectedTool === 'draw' && currentStroke.length > 1 && currentParticipant) {
            const annotation: Annotation = {
                id: `ann-${Date.now()}`,
                type: 'stroke',
                userId: currentParticipant.id,
                data: { points: currentStroke, color: selectedColor, width: strokeWidth },
            };
            onAnnotationCreate?.(annotation);
        }

        // Notify about final positions of moved components (for autosave)
        if (selectedTool === 'select' && selectedComponentIds.length > 0 && isDragging) {
            const freshComponents = useCircuitStore.getState().components;
            selectedComponentIds.forEach((id: string) => {
                const component = freshComponents.find((c: CircuitComponent) => c.id === id);
                if (component) {
                    onComponentMove?.(id, component.position);
                }
            });
        }

        setIsDragging(false);
        setDragStart(null);
        setCurrentStroke([]);
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(zoom * delta);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const canvasPos = screenToCanvas(screenPos.x, screenPos.y);

        try {
            const data = e.dataTransfer.getData('application/json');
            if (data) {
                const compDef: ComponentDefinition = JSON.parse(data);
                const component = createComponentInstance(compDef.type, canvasPos);
                if (component) {
                    onComponentAdd?.(component);
                }
            }
        } catch {
            onComponentDrop?.(canvasPos);
        }
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-circuit-canvas-bg dark:bg-gray-800 overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <canvas
                ref={canvasRef}
                className={`${selectedTool === 'wire' ? 'cursor-crosshair' : selectedTool === 'pan' ? 'cursor-grab' : selectedTool === 'erase' ? 'cursor-pointer' : selectedTool === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            />
        </div>
    );
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, panOffset: Position, zoom: number, isDarkMode = false) {
    const gridSize = 5;
    
    // Calculate visible area in canvas coordinates
    const startX = Math.floor(-panOffset.x / zoom / gridSize) * gridSize - gridSize;
    const startY = Math.floor(-panOffset.y / zoom / gridSize) * gridSize - gridSize;
    const endX = startX + width / zoom + gridSize * 4;
    const endY = startY + height / zoom + gridSize * 4;

    // Draw minor grid lines
    ctx.strokeStyle = isDarkMode ? '#374151' : '#E2E8F0';
    ctx.lineWidth = 0.5;
    for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
    
    // Major grid lines every 10 cells (50px)
    ctx.strokeStyle = isDarkMode ? '#4b5563' : '#CBD5E1';
    ctx.lineWidth = 1;
    const majorGridSize = gridSize * 10;
    const majorStartX = Math.floor(startX / majorGridSize) * majorGridSize;
    const majorStartY = Math.floor(startY / majorGridSize) * majorGridSize;
    
    for (let x = majorStartX; x < endX; x += majorGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    for (let y = majorStartY; y < endY; y += majorGridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
}

function drawComponent(ctx: CanvasRenderingContext2D, component: CircuitComponent, isSelected: boolean, remoteSelectionParticipantId?: string, showPinHighlight = false, isDarkMode = false, pinStates?: Record<string, SignalState>) {
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
    // Find the first input pin's state
    let inputSignalState: SignalState | undefined;
    if (pinStates) {
        const inputPin = component.pins.find(p => p.type === 'input');
        if (inputPin) {
            inputSignalState = pinStates[inputPin.id];
        }
    }

    // Draw component based on type
    drawComponentSymbol(ctx, type, width, height, isDarkMode, inputSignalState, component.properties);

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
    component.pins.forEach((pin) => {
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

function drawComponentSymbol(ctx: CanvasRenderingContext2D, type: string, width: number, height: number, isDarkMode = false, signalState?: SignalState, properties?: Record<string, unknown>) {
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
        const color = type === 'LED_RED' ? '#EF4444' : type === 'LED_GREEN' ? '#22C55E' : type === 'LED_BLUE' ? '#3B82F6' : '#FBBF24';
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
    // Sequential - Counters & Registers (with visual indicators)
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

function drawDefaultComponent(ctx: CanvasRenderingContext2D, width: number, height: number, type: string, isDarkMode: boolean) {
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

function drawAndGateSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isNand: boolean) {
    const w = width * 0.75;
    const h = height * 0.85;
    
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Gate body - IEEE AND shape
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 6, -h / 2);
    ctx.bezierCurveTo(w / 2 + 5, -h / 2, w / 2 + 5, h / 2, w / 6, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gradient.addColorStop(0, '#FAFAFA');
    gradient.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inversion bubble for NAND
    if (isNand) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#374151';
        ctx.beginPath();
        ctx.arc(w / 2 + 6, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('&', -4, 0);
}

function drawOrGateSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isNor: boolean) {
    const w = width * 0.75;
    const h = height * 0.85;
    
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Gate body - IEEE OR shape with curved back
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.quadraticCurveTo(-w / 4, 0, -w / 2, h / 2);
    ctx.bezierCurveTo(0, h / 2, w / 3, h / 3, w / 2 + 2, 0);
    ctx.bezierCurveTo(w / 3, -h / 3, 0, -h / 2, -w / 2, -h / 2);
    ctx.closePath();
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gradient.addColorStop(0, '#FAFAFA');
    gradient.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inversion bubble for NOR
    if (isNor) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#374151';
        ctx.beginPath();
        ctx.arc(w / 2 + 8, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 12px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('≥1', 0, 0);
}

function drawXorGateSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isXnor: boolean) {
    const w = width * 0.75;
    const h = height * 0.85;
    
    // Shadow for main body
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Main OR-shaped body
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.quadraticCurveTo(-w / 4, 0, -w / 2, h / 2);
    ctx.bezierCurveTo(0, h / 2, w / 3, h / 3, w / 2 + 2, 0);
    ctx.bezierCurveTo(w / 3, -h / 3, 0, -h / 2, -w / 2, -h / 2);
    ctx.closePath();
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gradient.addColorStop(0, '#FAFAFA');
    gradient.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Extra curved line for XOR (before the body)
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 8, -h / 2);
    ctx.quadraticCurveTo(-w / 4 - 8, 0, -w / 2 - 8, h / 2);
    ctx.stroke();

    // Inversion bubble for XNOR
    if (isXnor) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#374151';
        ctx.beginPath();
        ctx.arc(w / 2 + 8, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 12px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('=1', 0, 0);
}

function drawNotGateSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, hasInversion: boolean) {
    const w = width * 0.65;
    const h = height * 0.85;
    
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Triangle body
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2 - 6, 0);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gradient.addColorStop(0, '#FAFAFA');
    gradient.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inversion bubble
    if (hasInversion) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#374151';
        ctx.beginPath();
        ctx.arc(w / 2, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 12px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', -6, 0);
}

function drawToggleSwitchSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isOn = false) {
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

function drawPushButtonSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isPressed = false) {
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

function drawClockSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
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

function drawConstHighSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
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

function drawConstLowSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
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

function drawLedSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, color: string, isLit = false) {
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

function draw7SegmentSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
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
    ctx.beginPath(); ctx.moveTo(-segW / 2, -segH); ctx.lineTo(segW / 2, -segH); ctx.stroke();
    // Middle
    ctx.beginPath(); ctx.moveTo(-segW / 2, 0); ctx.lineTo(segW / 2, 0); ctx.stroke();
    // Bottom
    ctx.beginPath(); ctx.moveTo(-segW / 2, segH); ctx.lineTo(segW / 2, segH); ctx.stroke();
    // Left top
    ctx.beginPath(); ctx.moveTo(-segW / 2, -segH); ctx.lineTo(-segW / 2, 0); ctx.stroke();
    // Left bottom
    ctx.beginPath(); ctx.moveTo(-segW / 2, 0); ctx.lineTo(-segW / 2, segH); ctx.stroke();
    // Right top
    ctx.beginPath(); ctx.moveTo(segW / 2, -segH); ctx.lineTo(segW / 2, 0); ctx.stroke();
    // Right bottom
    ctx.beginPath(); ctx.moveTo(segW / 2, 0); ctx.lineTo(segW / 2, segH); ctx.stroke();
    
    ctx.shadowBlur = 0;
}

function drawFlipFlopSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, type: string) {
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

function drawVccSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Glow effect
    ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
    ctx.shadowBlur = 6;
    
    // Arrow pointing up
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, height / 2 - 6);
    ctx.lineTo(0, -height / 2 + 12);
    ctx.stroke();

    // Triangle at top with gradient
    const gradient = ctx.createLinearGradient(0, -height / 2, 0, -height / 2 + 12);
    gradient.addColorStop(0, '#F87171');
    gradient.addColorStop(1, '#DC2626');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -height / 2 + 2);
    ctx.lineTo(-8, -height / 2 + 14);
    ctx.lineTo(8, -height / 2 + 14);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#B91C1C';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#991B1B';
    ctx.font = 'bold 9px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VCC', 0, height / 2 - 6);
}

function drawGroundSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(0, -height / 2 + 4);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Ground bars with gradient effect
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();
    
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 5);
    ctx.lineTo(8, 5);
    ctx.stroke();
    
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(4, 10);
    ctx.stroke();
}

function drawMuxSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Trapezoid shape - wide input side, narrow output side
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 4, -height / 2 + 4);
    ctx.lineTo(width / 2 - 4, -height / 3);
    ctx.lineTo(width / 2 - 4, height / 3);
    ctx.lineTo(-width / 2 + 4, height / 2 - 4);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    gradient.addColorStop(0, '#F3E8FF');
    gradient.addColorStop(1, '#DDD6FE');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Input arrows showing multiple inputs
    ctx.strokeStyle = '#9333EA';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Multiple input lines on left
    ctx.moveTo(-width / 2 + 8, -height / 3);
    ctx.lineTo(-width / 2 + 16, -height / 3);
    ctx.moveTo(-width / 2 + 8, 0);
    ctx.lineTo(-width / 2 + 16, 0);
    ctx.moveTo(-width / 2 + 8, height / 3);
    ctx.lineTo(-width / 2 + 16, height / 3);
    ctx.stroke();
    
    // Output arrow on right
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 16, 0);
    ctx.lineTo(width / 2 - 8, 0);
    ctx.stroke();
    
    // SEL label at bottom
    ctx.fillStyle = '#7C3AED';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SEL', 0, height / 3 + 4);
    
    // MUX label
    ctx.font = 'bold 9px "SF Pro Display", -apple-system, sans-serif';
    ctx.fillText('MUX', 0, -4);
}

function drawTrafficLightCtrlSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Box with traffic light icon
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(-width / 2, -height / 2, width, height);

    // Draw mini traffic light representation
    const lightRadius = 5;
    const spacing = 14;

    // Red light
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, -spacing, lightRadius, 0, Math.PI * 2);
    ctx.fill();

    // Yellow light
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(0, 0, lightRadius, 0, Math.PI * 2);
    ctx.fill();

    // Green light
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(0, spacing, lightRadius, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('CTRL', 0, height / 2 - 10);
}

function drawJunctionSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Simple dot for junction
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
}

function drawProbeSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isHigh = false) {
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

function drawWire(ctx: CanvasRenderingContext2D, wire: Wire, components: CircuitComponent[], signalState?: SignalState) {
    const fromComponent = components.find((c) => c.id === wire.fromComponentId);
    const toComponent = components.find((c) => c.id === wire.toComponentId);
    if (!fromComponent || !toComponent) return;

    const fromPin = fromComponent.pins.find((p) => p.id === wire.fromPinId);
    const toPin = toComponent.pins.find((p) => p.id === wire.toPinId);
    if (!fromPin || !toPin) return;

    const startX = fromComponent.position.x + fromPin.position.x;
    const startY = fromComponent.position.y + fromPin.position.y;
    const endX = toComponent.position.x + toPin.position.x;
    const endY = toComponent.position.y + toPin.position.y;

    // Calculate orthogonal routing path
    const gridSize = 20;
    const path = calculateOrthogonalPath(startX, startY, endX, endY, gridSize);

    // Determine wire color and style based on signal state
    let wireColor = '#6B7280';
    let wireWidth = 2.5;
    let glowColor = '';
    
    if (signalState) {
        const style = getWireStyle(signalState);
        wireColor = style.color;
        wireWidth = 3;
        if (signalState === 'HIGH') {
            glowColor = '#22C55E';
        } else if (signalState === 'ERROR' || signalState === 'UNDEFINED') {
            glowColor = '#EF4444';
        }
        if (style.dashed) {
            ctx.setLineDash([6, 4]);
        } else {
            ctx.setLineDash([]);
        }
    }

    // Draw glow effect for active wires
    if (glowColor) {
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = wireWidth + 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.3;
        
        ctx.beginPath();
        if (path.length > 0 && path[0]) {
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                const point = path[i];
                if (point) ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Draw main wire
    ctx.strokeStyle = wireColor;
    ctx.lineWidth = wireWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (path.length > 0 && path[0]) {
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            const point = path[i];
            if (point) ctx.lineTo(point.x, point.y);
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw connection dots at endpoints with gradient
    const dotGradient = ctx.createRadialGradient(startX, startY, 0, startX, startY, 4);
    dotGradient.addColorStop(0, wireColor);
    dotGradient.addColorStop(1, wireColor + '80');
    
    ctx.fillStyle = dotGradient;
    ctx.beginPath();
    ctx.arc(startX, startY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    const dotGradient2 = ctx.createRadialGradient(endX, endY, 0, endX, endY, 4);
    dotGradient2.addColorStop(0, wireColor);
    dotGradient2.addColorStop(1, wireColor + '80');
    
    ctx.fillStyle = dotGradient2;
    ctx.beginPath();
    ctx.arc(endX, endY, 4, 0, Math.PI * 2);
    ctx.fill();
}

function calculateOrthogonalPath(startX: number, startY: number, endX: number, endY: number, gridSize: number): Position[] {
    const path: Position[] = [];

    // Snap to grid
    const snapToGrid = (val: number) => Math.round(val / gridSize) * gridSize;

    path.push({ x: startX, y: startY });

    const dx = endX - startX;
    const dy = endY - startY;

    // Determine routing strategy based on relative positions
    if (Math.abs(dx) < gridSize && Math.abs(dy) < gridSize) {
        // Very close, direct connection
        path.push({ x: endX, y: endY });
    } else if (dx > 0) {
        // End is to the right of start (normal case for output -> input)
        const midX = snapToGrid(startX + dx / 2);

        if (Math.abs(dy) < gridSize) {
            // Nearly horizontal - go straight with small jog
            path.push({ x: midX, y: startY });
            path.push({ x: midX, y: endY });
        } else {
            // Need vertical routing
            // First go right a bit
            const exitX = startX + Math.min(gridSize * 2, dx / 3);
            path.push({ x: exitX, y: startY });
            // Then go vertical
            path.push({ x: exitX, y: snapToGrid(startY + dy / 2) });
            // Then horizontal to near end
            const entryX = endX - Math.min(gridSize * 2, dx / 3);
            path.push({ x: entryX, y: snapToGrid(startY + dy / 2) });
            // Then vertical to end level
            path.push({ x: entryX, y: endY });
        }
    } else {
        // End is to the left of start (need to route around)
        const offsetY = dy > 0 ? gridSize * 3 : -gridSize * 3;

        // Go right first
        path.push({ x: startX + gridSize * 2, y: startY });
        // Go up/down
        path.push({ x: startX + gridSize * 2, y: startY + offsetY });
        // Go left past the end
        path.push({ x: endX - gridSize * 2, y: startY + offsetY });
        // Go to end level
        path.push({ x: endX - gridSize * 2, y: endY });
    }

    path.push({ x: endX, y: endY });

    return path;
}

// Passive component symbols
function drawResistorSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Zigzag resistor symbol
    const zigWidth = 6;
    const zigHeight = height * 0.6;
    
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 8, 0);
    ctx.lineTo(-zigWidth * 3, 0);
    ctx.lineTo(-zigWidth * 2.5, -zigHeight / 2);
    ctx.lineTo(-zigWidth * 1.5, zigHeight / 2);
    ctx.lineTo(-zigWidth * 0.5, -zigHeight / 2);
    ctx.lineTo(zigWidth * 0.5, zigHeight / 2);
    ctx.lineTo(zigWidth * 1.5, -zigHeight / 2);
    ctx.lineTo(zigWidth * 2.5, zigHeight / 2);
    ctx.lineTo(zigWidth * 3, 0);
    ctx.lineTo(width / 2 - 8, 0);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#6B7280';
    ctx.font = '8px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('R', 0, height / 2 - 4);
}

function drawCapacitorSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    const plateHeight = height * 0.5;
    const gap = 6;
    
    // Left lead
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 8, 0);
    ctx.lineTo(-gap / 2, 0);
    ctx.stroke();
    
    // Left plate
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-gap / 2, -plateHeight / 2);
    ctx.lineTo(-gap / 2, plateHeight / 2);
    ctx.stroke();
    
    // Right plate
    ctx.beginPath();
    ctx.moveTo(gap / 2, -plateHeight / 2);
    ctx.lineTo(gap / 2, plateHeight / 2);
    ctx.stroke();
    
    // Right lead
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gap / 2, 0);
    ctx.lineTo(width / 2 - 8, 0);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#6B7280';
    ctx.font = '8px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('C', 0, height / 2 - 4);
}

function drawDiodeSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    const triSize = 12;
    
    // Left lead
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 8, 0);
    ctx.lineTo(-triSize / 2, 0);
    ctx.stroke();
    
    // Triangle (anode)
    ctx.fillStyle = '#E5E7EB';
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
    
    // Right lead
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(triSize / 2, 0);
    ctx.lineTo(width / 2 - 8, 0);
    ctx.stroke();
}

// Counter symbol - shows incrementing count
function drawCounterSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    drawICBase(ctx, width, height, '#1E3A8A', '#1E40AF');
    
    // Count display showing "0→F" to indicate counting
    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 10px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0→F', 0, -8);
    
    // Up arrow indicating count up
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(0, 6);
    ctx.moveTo(-4, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(4, 10);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#93C5FD';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.fillText('COUNTER', 0, height / 2 - 10);
}

// Shift Register symbol - shows data shifting
function drawShiftRegisterSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    drawICBase(ctx, width, height, '#7C2D12', '#9A3412');
    
    // Shift arrows showing data movement
    ctx.strokeStyle = '#FDBA74';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Draw shifting boxes with arrow
    const boxSize = 10;
    const startX = -20;
    for (let i = 0; i < 4; i++) {
        const x = startX + i * 12;
        ctx.strokeStyle = '#FDBA74';
        ctx.strokeRect(x, -boxSize/2, boxSize, boxSize);
    }
    
    // Arrow showing shift direction
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(22, 0);
    ctx.moveTo(18, -4);
    ctx.lineTo(22, 0);
    ctx.lineTo(18, 4);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#FED7AA';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHIFT REG', 0, height / 2 - 10);
}

// Adder symbol - shows addition operation
function drawAdderSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    drawICBase(ctx, width, height, '#14532D', '#166534');
    
    // Large plus symbol
    ctx.strokeStyle = '#86EFAC';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.stroke();
    
    // A + B labels
    ctx.fillStyle = '#86EFAC';
    ctx.font = 'bold 8px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', -18, -8);
    ctx.fillText('B', -18, 8);
    ctx.fillText('Σ', 18, 0);
    
    // Label
    ctx.fillStyle = '#BBF7D0';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.fillText('ADDER', 0, height / 2 - 10);
}

// Comparator symbol - shows comparison
function drawComparatorSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    drawICBase(ctx, width, height, '#581C87', '#6B21A8');
    
    // Comparison symbols
    ctx.fillStyle = '#D8B4FE';
    ctx.font = 'bold 10px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', -16, 0);
    ctx.fillText('B', 16, 0);
    
    // Comparison operators in center
    ctx.font = 'bold 8px "SF Pro Display", -apple-system, sans-serif';
    ctx.fillText('< = >', 0, 0);
    
    // Label
    ctx.fillStyle = '#E9D5FF';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.fillText('COMPARE', 0, height / 2 - 10);
}

// Decoder symbol - shows 1-to-many
function drawDecoderSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    drawICBase(ctx, width, height, '#0C4A6E', '#075985');
    
    // Input lines converging to expansion
    ctx.strokeStyle = '#7DD3FC';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Input side (narrow)
    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(-8, -6);
    ctx.moveTo(-18, 6);
    ctx.lineTo(-8, 6);
    ctx.stroke();
    
    // Expansion triangle
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(8, -16);
    ctx.moveTo(-8, 10);
    ctx.lineTo(8, 16);
    ctx.moveTo(-8, -10);
    ctx.lineTo(-8, 10);
    ctx.stroke();
    
    // Output lines (expanded)
    ctx.beginPath();
    ctx.moveTo(8, -16);
    ctx.lineTo(18, -16);
    ctx.moveTo(8, -6);
    ctx.lineTo(18, -6);
    ctx.moveTo(8, 6);
    ctx.lineTo(18, 6);
    ctx.moveTo(8, 16);
    ctx.lineTo(18, 16);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#BAE6FD';
    ctx.font = '7px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DECODER', 0, height / 2 - 10);
}

// Helper function for IC base
function drawICBase(ctx: CanvasRenderingContext2D, width: number, height: number, colorDark: string, colorLight: string) {
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

function drawDipSwitchSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
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
        ctx.fillRect(x - switchWidth / 2 + 1, -switchHeight / 2 + 1, switchWidth - 2, switchHeight / 2 - 1);
    }
    
    // Label
    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 7px "SF Pro Display", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DIP', 0, height / 2 - 8);
}

function drawNumericInputSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
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

function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeData) {
    if (stroke.points.length < 2 || !stroke.points[0]) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    stroke.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
}

function drawCursor(ctx: CanvasRenderingContext2D, position: Position, color: string, name: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    ctx.lineTo(position.x + 12, position.y + 10);
    ctx.lineTo(position.x + 4, position.y + 10);
    ctx.lineTo(position.x, position.y + 16);
    ctx.closePath();
    ctx.fill();

    ctx.font = '11px sans-serif';
    const textWidth = ctx.measureText(name).width;
    ctx.fillStyle = color;
    ctx.fillRect(position.x + 14, position.y + 8, textWidth + 8, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(name, position.x + 18, position.y + 19);
}

function findComponentAtPosition(components: CircuitComponent[], position: Position): CircuitComponent | undefined {
    return components.find((component) => {
        const def = getComponentDefinition(component.type);
        const width = def?.width || 60;
        const height = def?.height || 40;
        const left = component.position.x - width / 2;
        const right = component.position.x + width / 2;
        const top = component.position.y - height / 2;
        const bottom = component.position.y + height / 2;
        return position.x >= left && position.x <= right && position.y >= top && position.y <= bottom;
    });
}
