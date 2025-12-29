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
                selectedComponentIds.forEach((id: string) => {
                    const component = components.find((c: CircuitComponent) => c.id === id);
                    if (component) {
                        onComponentMove?.(id, { x: component.position.x + dx, y: component.position.y + dy });
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
    const gridSize = 20;
    ctx.strokeStyle = isDarkMode ? '#4a4a6a' : '#E2E8F0';
    ctx.lineWidth = 0.5;

    // Calculate visible area in canvas coordinates
    const startX = Math.floor(-panOffset.x / zoom / gridSize) * gridSize - gridSize;
    const startY = Math.floor(-panOffset.y / zoom / gridSize) * gridSize - gridSize;
    const endX = startX + width / zoom + gridSize * 4;
    const endY = startY + height / zoom + gridSize * 4;

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
    // Default box
    else {
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.strokeRect(-width / 2, -height / 2, width, height);
        ctx.fillStyle = isDarkMode ? '#2a2a40' : '#374151';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = type.replace(/_/g, ' ');
        ctx.fillText(label.length > 12 ? label.substring(0, 12) : label, 0, 0);
    }
}

function drawAndGateSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isNand: boolean) {
    const w = width * 0.7;
    const h = height * 0.8;

    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(0, -h / 2);
    ctx.arc(0, 0, h / 2, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isNand) {
        ctx.beginPath();
        ctx.arc(w / 2 + 4, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isNand ? '&' : '&', -5, 0);
}

function drawOrGateSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isNor: boolean) {
    const w = width * 0.7;
    const h = height * 0.8;

    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.quadraticCurveTo(-w / 4, 0, -w / 2, h / 2);
    ctx.quadraticCurveTo(w / 4, h / 2, w / 2, 0);
    ctx.quadraticCurveTo(w / 4, -h / 2, -w / 2, -h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isNor) {
        ctx.beginPath();
        ctx.arc(w / 2 + 4, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('≥1', -2, 0);
}

function drawXorGateSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isXnor: boolean) {
    const w = width * 0.7;
    const h = height * 0.8;

    // Extra curve for XOR
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 6, -h / 2);
    ctx.quadraticCurveTo(-w / 4 - 6, 0, -w / 2 - 6, h / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.quadraticCurveTo(-w / 4, 0, -w / 2, h / 2);
    ctx.quadraticCurveTo(w / 4, h / 2, w / 2, 0);
    ctx.quadraticCurveTo(w / 4, -h / 2, -w / 2, -h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isXnor) {
        ctx.beginPath();
        ctx.arc(w / 2 + 4, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('=1', -2, 0);
}

function drawNotGateSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, hasInversion: boolean) {
    const w = width * 0.6;
    const h = height * 0.8;

    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2 - 4, 0);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (hasInversion) {
        ctx.beginPath();
        ctx.arc(w / 2, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', -8, 0);
}

function drawToggleSwitchSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isOn = false) {
    // Switch body - green tint when ON
    ctx.fillStyle = isOn ? '#DCFCE7' : '#E5E7EB';
    ctx.fillRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8);
    ctx.strokeStyle = isOn ? '#22C55E' : '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8);

    // Switch lever
    ctx.fillStyle = isOn ? '#22C55E' : '#6B7280';
    ctx.beginPath();
    ctx.arc(-5, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.stroke();

    ctx.strokeStyle = isOn ? '#22C55E' : '#374151';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    // Lever points up when ON, down when OFF
    if (isOn) {
        ctx.lineTo(10, 8); // Points down-right when ON
    } else {
        ctx.lineTo(10, -8); // Points up-right when OFF
    }
    ctx.stroke();

    // ON/OFF indicator text
    ctx.fillStyle = isOn ? '#166534' : '#6B7280';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isOn ? 'ON' : 'OFF', 0, height / 2 - 2);
}

function drawPushButtonSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, isPressed = false) {
    // Button outline - green tint when pressed
    ctx.fillStyle = isPressed ? '#DCFCE7' : '#DBEAFE';
    ctx.beginPath();
    ctx.arc(0, 0, height / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isPressed ? '#22C55E' : '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner button - green when pressed
    ctx.fillStyle = isPressed ? '#22C55E' : '#3B82F6';
    ctx.beginPath();
    ctx.arc(0, 0, height / 3 - 4, 0, Math.PI * 2);
    ctx.fill();

    // Add glow effect when pressed
    if (isPressed) {
        ctx.shadowColor = '#22C55E';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, height / 3 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function drawClockSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeRect(-width / 2, -height / 2, width, height);

    // Clock wave
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, 5);
    ctx.lineTo(-15, -5);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.lineTo(5, 5);
    ctx.lineTo(5, -5);
    ctx.lineTo(15, -5);
    ctx.stroke();

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLK', 0, 14);
}

function drawConstHighSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#DCFCE7';
    ctx.beginPath();
    ctx.arc(0, 0, height / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#166534';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+V', 0, 0);
}

function drawConstLowSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#FEE2E2';
    ctx.beginPath();
    ctx.arc(0, 0, height / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#991B1B';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', 0, 0);
}

function drawLedSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, color: string, isLit = false) {
    // LED body (triangle) - brighter when lit
    ctx.fillStyle = isLit ? color : color + '40'; // Full color when lit, semi-transparent when off
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(-10, 10);
    ctx.lineTo(8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // LED bar
    ctx.beginPath();
    ctx.moveTo(8, -10);
    ctx.lineTo(8, 10);
    ctx.stroke();

    // Light rays - only show when lit
    if (isLit) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, -12);
        ctx.lineTo(8, -18);
        ctx.moveTo(8, -12);
        ctx.lineTo(16, -18);
        ctx.stroke();

        // Add glow effect when lit
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function draw7SegmentSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeStyle = '#374151';
    ctx.strokeRect(-width / 2, -height / 2, width, height);

    // Draw "8" pattern
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const segW = 12;
    const segH = 18;
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
}

function drawFlipFlopSymbol(ctx: CanvasRenderingContext2D, width: number, height: number, type: string) {
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeRect(-width / 2, -height / 2, width, height);

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (type === 'D_FLIPFLOP') {
        ctx.fillText('D', -width / 4, -height / 4);
        ctx.fillText('Q', width / 4, -height / 4);
        ctx.fillText('>', -width / 4, height / 4);
        ctx.fillText("Q'", width / 4, height / 4);
    } else if (type === 'SR_LATCH') {
        ctx.fillText('S', -width / 4, -height / 4);
        ctx.fillText('Q', width / 4, -height / 4);
        ctx.fillText('R', -width / 4, height / 4);
        ctx.fillText("Q'", width / 4, height / 4);
    } else if (type === 'JK_FLIPFLOP') {
        ctx.fillText('J', -width / 4, -height / 4);
        ctx.fillText('Q', width / 4, -height / 4);
        ctx.fillText('>', -width / 4, 0);
        ctx.fillText('K', -width / 4, height / 4);
        ctx.fillText("Q'", width / 4, height / 4);
    }
}

function drawVccSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;

    // Arrow pointing up
    ctx.beginPath();
    ctx.moveTo(0, height / 2 - 4);
    ctx.lineTo(0, -height / 2 + 8);
    ctx.stroke();

    // Triangle at top
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(0, -height / 2 + 2);
    ctx.lineTo(-6, -height / 2 + 10);
    ctx.lineTo(6, -height / 2 + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VCC', 0, height / 2 - 8);
}

function drawGroundSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(0, -height / 2 + 4);
    ctx.lineTo(0, 2);
    ctx.stroke();

    // Ground bars
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.lineTo(10, 2);
    ctx.moveTo(-6, 6);
    ctx.lineTo(6, 6);
    ctx.moveTo(-3, 10);
    ctx.lineTo(3, 10);
    ctx.stroke();
}

function drawMuxSymbol(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Trapezoid shape for multiplexer
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-width / 2, -height / 2);
    ctx.lineTo(width / 2, -height / 3);
    ctx.lineTo(width / 2, height / 3);
    ctx.lineTo(-width / 2, height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MUX', 0, 0);
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

    // Use simulation colors if available
    if (signalState) {
        const style = getWireStyle(signalState);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 3;
        if (style.dashed) {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }
    } else {
        ctx.strokeStyle = '#4B5563';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
    }

    // Calculate orthogonal routing path (grid-aligned)
    const gridSize = 20;
    const path = calculateOrthogonalPath(startX, startY, endX, endY, gridSize);

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (path.length > 0 && path[0]) {
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            const point = path[i];
            if (point) ctx.lineTo(point.x, point.y);
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw connection dots at endpoints
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.beginPath();
    ctx.arc(startX, startY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
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
