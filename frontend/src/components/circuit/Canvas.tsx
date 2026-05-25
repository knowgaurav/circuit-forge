'use client';

import { useRef, useEffect, useCallback, useState, MouseEvent, DragEvent } from 'react';
import { useCircuitStore, useSessionStore, useUIStore } from '@/stores';
import type { Position, CircuitComponent, Wire, Annotation, StrokeData, Pin } from '@/types';
import {
    ComponentDefinition,
    createComponentInstance,
    getComponentDefinition,
} from '@/constants/components';
import type { SimulationResult } from '@/features/simulation';
import {
    drawGrid,
    drawComponent,
    drawWire,
    calculateOrthogonalPath,
} from '@/features/canvas/renderers';

interface CanvasProps {
    onComponentSelect?: (componentId: string) => void;
    onComponentMove?: (componentId: string, position: Position) => void;
    onAnnotationCreate?: (annotation: Annotation) => void;
    onComponentDrop?: (position: Position) => void;
    onComponentAdd?: (component: unknown) => void;
    onWireCreate?: (
        fromComponentId: string,
        fromPinId: string,
        toComponentId: string,
        toPinId: string
    ) => void;
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
    const [wireStart, setWireStart] = useState<{
        componentId: string;
        pinId: string;
        position: Position;
    } | null>(null);
    const [wirePreview, setWirePreview] = useState<Position | null>(null);
    const lastClickRef = useRef<{ time: number; componentId: string | null }>({
        time: 0,
        componentId: null,
    });

    const screenToCanvas = useCallback(
        (screenX: number, screenY: number): Position => {
            return {
                x: (screenX - panOffset.x) / zoom,
                y: (screenY - panOffset.y) / zoom,
            };
        },
        [panOffset, zoom]
    );

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
                wireStart.position.x,
                wireStart.position.y,
                wirePreview.x,
                wirePreview.y,
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
            drawComponent(
                ctx,
                component,
                isSelected,
                remoteSelectionId,
                selectedTool === 'wire',
                isDarkMode,
                componentPinStates
            );
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

        remoteCursors.forEach(
            (cursor: {
                participantId: string;
                position: Position;
                color: string;
                displayName: string;
            }) => {
                if (cursor.participantId !== currentParticipant?.id) {
                    drawCursor(ctx, cursor.position, cursor.color, cursor.displayName);
                }
            }
        );

        ctx.restore();
    }, [
        components,
        wires,
        annotations,
        selectedComponentIds,
        remoteCursors,
        remoteSelections,
        currentParticipant,
        zoom,
        panOffset,
        selectedColor,
        strokeWidth,
        currentStroke,
        wireStart,
        wirePreview,
        selectedTool,
        simulationResult,
        isDarkMode,
    ]);

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

    const findPinAtPosition = (
        canvasPos: Position
    ): { component: CircuitComponent; pin: Pin } | null => {
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

    const findAnnotationAtPosition = useCallback(
        (canvasPos: Position): Annotation | null => {
            const hitRadius = 10; // Distance threshold for erasing
            for (const annotation of annotations) {
                if (annotation.type === 'stroke') {
                    const strokeData = annotation.data as StrokeData;
                    for (const point of strokeData.points) {
                        const dist = Math.sqrt(
                            (canvasPos.x - point.x) ** 2 + (canvasPos.y - point.y) ** 2
                        );
                        if (dist < hitRadius + strokeData.width / 2) {
                            return annotation;
                        }
                    }
                }
            }
            return null;
        },
        [annotations]
    );

    const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const canvasPos = screenToCanvas(screenPos.x, screenPos.y);

        // Check if clicking on a switch during simulation
        if (isSimulationRunning) {
            const clickedComponent = findComponentAtPosition(components, canvasPos);
            if (
                clickedComponent &&
                (clickedComponent.type === 'SWITCH_TOGGLE' ||
                    clickedComponent.type === 'SWITCH_PUSH')
            ) {
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
                setWireStart({
                    componentId: pinHit.component.id,
                    pinId: pinHit.pin.id,
                    position: pinPos,
                });
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
                        setSelectedComponentIds(
                            selectedComponentIds.filter((id: string) => id !== clickedComponent.id)
                        );
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
                        store.moveComponent(id, {
                            x: component.position.x + dx,
                            y: component.position.y + dy,
                        });
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
            if (
                pinHit &&
                pinHit.pin.type === 'input' &&
                pinHit.component.id !== wireStart.componentId
            ) {
                onWireCreate?.(
                    wireStart.componentId,
                    wireStart.pinId,
                    pinHit.component.id,
                    pinHit.pin.id
                );
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
            className="bg-canvas-bg h-full w-full overflow-hidden"
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

function drawCursor(
    ctx: CanvasRenderingContext2D,
    position: Position,
    color: string,
    name: string
) {
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

function findComponentAtPosition(
    components: CircuitComponent[],
    position: Position
): CircuitComponent | undefined {
    return components.find((component) => {
        const def = getComponentDefinition(component.type);
        const width = def?.width || 60;
        const height = def?.height || 40;
        const left = component.position.x - width / 2;
        const right = component.position.x + width / 2;
        const top = component.position.y - height / 2;
        const bottom = component.position.y + height / 2;
        return (
            position.x >= left && position.x <= right && position.y >= top && position.y <= bottom
        );
    });
}
