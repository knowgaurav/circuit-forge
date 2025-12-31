'use client';

import { useState, useCallback } from 'react';
import { MousePointer2, Hand, Spline, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { Canvas } from './Canvas';
import { ComponentPalette } from './ComponentPalette';
import { SimulationOverlay } from './SimulationOverlay';
import { IconButton, Tooltip } from '@/components/ui';
import { createComponentInstance, ComponentDefinition } from '@/constants/components';
import { useCircuitStore, useUIStore, Tool } from '@/stores';
import type { SimulationResult } from '@/services/simulation';
import type { Position, CircuitComponent, Wire } from '@/types';

interface EmbeddedPlaygroundProps {
    height?: number;
    onBlueprintLoad?: () => void;
}

export function EmbeddedPlayground({ height = 500 }: EmbeddedPlaygroundProps) {
    const circuitStore = useCircuitStore();
    const uiStore = useUIStore();

    const [draggingComponent, setDraggingComponent] = useState<ComponentDefinition | null>(null);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isSimulationRunning, setIsSimulationRunning] = useState(false);

    const handleToolSelect = (tool: Tool) => {
        uiStore.setSelectedTool(tool);
    };

    const handleZoomIn = () => {
        const newZoom = Math.min(uiStore.zoom * 1.25, 4);
        uiStore.setZoom(newZoom);
    };

    const handleZoomOut = () => {
        const newZoom = Math.max(uiStore.zoom / 1.25, 0.25);
        uiStore.setZoom(newZoom);
    };

    const handleDeleteSelected = () => {
        if (uiStore.selectedComponentIds.length === 0) return;
        uiStore.selectedComponentIds.forEach((id: string) => {
            circuitStore.deleteComponent(id);
        });
        uiStore.clearSelection();
    };

    const handleComponentMove = useCallback((componentId: string, position: Position) => {
        circuitStore.moveComponent(componentId, position);
    }, [circuitStore]);

    const handleComponentAdd = useCallback((component: unknown) => {
        circuitStore.addComponent(component as CircuitComponent);
    }, [circuitStore]);

    const handleComponentDelete = useCallback((componentId: string) => {
        circuitStore.deleteComponent(componentId);
    }, [circuitStore]);

    const handleComponentDrop = useCallback((position: Position) => {
        if (!draggingComponent) return;
        const existingLabels = circuitStore.components.map(c => c.label).filter(Boolean);
        const component = createComponentInstance(draggingComponent.type, position, existingLabels);
        if (component) {
            circuitStore.addComponent(component);
        }
        setDraggingComponent(null);
    }, [draggingComponent, circuitStore]);

    const handleWireCreate = useCallback((fromComponentId: string, fromPinId: string, toComponentId: string, toPinId: string) => {
        const wire: Wire = {
            id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fromComponentId,
            fromPinId,
            toComponentId,
            toPinId,
            waypoints: [],
        };
        circuitStore.addWire(wire);
    }, [circuitStore]);

    const handleWireDelete = useCallback((wireId: string) => {
        circuitStore.deleteWire(wireId);
    }, [circuitStore]);

    return (
        <div className="flex rounded-xl overflow-hidden border border-white/10" style={{ height }}>
            {/* Mini Toolbar */}
            <div className="w-10 bg-gray-800 border-r border-white/10 flex flex-col items-center py-2 gap-1">
                <Tooltip content="Select" position="right">
                    <IconButton
                        icon={<MousePointer2 className="w-4 h-4" />}
                        onClick={() => handleToolSelect('select')}
                        variant={uiStore.selectedTool === 'select' ? 'primary' : 'ghost'}
                        size="sm"
                        aria-label="Select tool"
                    />
                </Tooltip>
                <Tooltip content="Pan" position="right">
                    <IconButton
                        icon={<Hand className="w-4 h-4" />}
                        onClick={() => handleToolSelect('pan')}
                        variant={uiStore.selectedTool === 'pan' ? 'primary' : 'ghost'}
                        size="sm"
                        aria-label="Pan tool"
                    />
                </Tooltip>
                <Tooltip content="Wire" position="right">
                    <IconButton
                        icon={<Spline className="w-4 h-4" />}
                        onClick={() => handleToolSelect('wire')}
                        variant={uiStore.selectedTool === 'wire' ? 'primary' : 'ghost'}
                        size="sm"
                        aria-label="Wire tool"
                    />
                </Tooltip>

                <div className="w-6 h-px bg-white/10 my-1" />

                <Tooltip content="Delete selected" position="right">
                    <IconButton
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={handleDeleteSelected}
                        disabled={uiStore.selectedComponentIds.length === 0}
                        variant="ghost"
                        size="sm"
                        aria-label="Delete"
                    />
                </Tooltip>

                <div className="flex-1" />

                <div className="text-[10px] text-gray-400 mb-1">
                    {Math.round(uiStore.zoom * 100)}%
                </div>
                <IconButton
                    icon={<ZoomOut className="w-3 h-3" />}
                    onClick={handleZoomOut}
                    size="sm"
                    aria-label="Zoom out"
                />
                <IconButton
                    icon={<ZoomIn className="w-3 h-3" />}
                    onClick={handleZoomIn}
                    size="sm"
                    aria-label="Zoom in"
                />
            </div>

            {/* Component Palette */}
            <div className="w-48 bg-gray-800 border-r border-white/10 overflow-hidden">
                <ComponentPalette onDragStart={setDraggingComponent} />
            </div>

            {/* Canvas */}
            <div className="flex-1 relative bg-gray-900">
                {/* Simulation controls overlay */}
                <div className="absolute top-2 right-2 z-10">
                    <SimulationOverlay
                        canSimulate={true}
                        isRunning={isSimulationRunning}
                        remoteResult={null}
                        onStart={() => setIsSimulationRunning(true)}
                        onStop={() => {
                            setIsSimulationRunning(false);
                            setSimulationResult(null);
                        }}
                        onSimulationResult={setSimulationResult}
                        onSimulationStateChange={setIsSimulationRunning}
                    />
                </div>

                <Canvas
                    simulationResult={simulationResult}
                    isSimulationRunning={isSimulationRunning}
                    onComponentAdd={handleComponentAdd}
                    onComponentMove={handleComponentMove}
                    onComponentDelete={handleComponentDelete}
                    onWireCreate={handleWireCreate}
                    onWireDelete={handleWireDelete}
                    onComponentDrop={handleComponentDrop}
                    onSwitchToggle={(componentId) => {
                        circuitStore.toggleSwitchState(componentId);
                    }}
                    draggingComponent={draggingComponent}
                />
            </div>
        </div>
    );
}
