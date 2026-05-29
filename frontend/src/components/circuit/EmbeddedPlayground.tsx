'use client';

import { useState, useCallback } from 'react';

import { MousePointer2, Hand, Spline, Trash2, ZoomIn, ZoomOut } from 'lucide-react';

import { IconButton, Tooltip } from '@/components/ui';

import { createComponentInstance } from '@/constants/components';
import { useCircuitStore, useUIStore } from '@/stores';

import { Canvas } from './Canvas';
import { ComponentPalette } from './ComponentPalette';
import { SimulationOverlay } from './SimulationOverlay';

import type { ComponentDefinition } from '@/constants/components';
import type { SimulationResult } from '@/features/simulation';
import type { Tool } from '@/stores';
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

    const handleComponentMove = useCallback(
        (componentId: string, position: Position) => {
            circuitStore.moveComponent(componentId, position);
        },
        [circuitStore]
    );

    const handleComponentAdd = useCallback(
        (component: unknown) => {
            circuitStore.addComponent(component as CircuitComponent);
        },
        [circuitStore]
    );

    const handleComponentDelete = useCallback(
        (componentId: string) => {
            circuitStore.deleteComponent(componentId);
        },
        [circuitStore]
    );

    const handleComponentDrop = useCallback(
        (position: Position) => {
            if (!draggingComponent) return;
            const existingLabels = circuitStore.components.map((c) => c.label).filter(Boolean);
            const component = createComponentInstance(
                draggingComponent.type,
                position,
                existingLabels
            );
            if (component) {
                circuitStore.addComponent(component);
            }
            setDraggingComponent(null);
        },
        [draggingComponent, circuitStore]
    );

    const handleWireCreate = useCallback(
        (fromComponentId: string, fromPinId: string, toComponentId: string, toPinId: string) => {
            const wire: Wire = {
                id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                fromComponentId,
                fromPinId,
                toComponentId,
                toPinId,
                waypoints: [],
            };
            circuitStore.addWire(wire);
        },
        [circuitStore]
    );

    const handleWireDelete = useCallback(
        (wireId: string) => {
            circuitStore.deleteWire(wireId);
        },
        [circuitStore]
    );

    return (
        <div className="flex overflow-hidden rounded-xl border border-white/10" style={{ height }}>
            {/* Mini Toolbar */}
            <div className="flex w-10 flex-col items-center gap-1 border-r border-white/10 bg-gray-800 py-2">
                <Tooltip content="Select" position="right">
                    <IconButton
                        icon={<MousePointer2 className="h-4 w-4" />}
                        onClick={() => handleToolSelect('select')}
                        variant={uiStore.selectedTool === 'select' ? 'primary' : 'ghost'}
                        size="sm"
                        aria-label="Select tool"
                    />
                </Tooltip>
                <Tooltip content="Pan" position="right">
                    <IconButton
                        icon={<Hand className="h-4 w-4" />}
                        onClick={() => handleToolSelect('pan')}
                        variant={uiStore.selectedTool === 'pan' ? 'primary' : 'ghost'}
                        size="sm"
                        aria-label="Pan tool"
                    />
                </Tooltip>
                <Tooltip content="Wire" position="right">
                    <IconButton
                        icon={<Spline className="h-4 w-4" />}
                        onClick={() => handleToolSelect('wire')}
                        variant={uiStore.selectedTool === 'wire' ? 'primary' : 'ghost'}
                        size="sm"
                        aria-label="Wire tool"
                    />
                </Tooltip>

                <div className="my-1 h-px w-6 bg-white/10" />

                <Tooltip content="Delete selected" position="right">
                    <IconButton
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={handleDeleteSelected}
                        disabled={uiStore.selectedComponentIds.length === 0}
                        variant="ghost"
                        size="sm"
                        aria-label="Delete"
                    />
                </Tooltip>

                <div className="flex-1" />

                <div className="mb-1 text-[10px] text-gray-400">
                    {Math.round(uiStore.zoom * 100)}%
                </div>
                <IconButton
                    icon={<ZoomOut className="h-3 w-3" />}
                    onClick={handleZoomOut}
                    size="sm"
                    aria-label="Zoom out"
                />
                <IconButton
                    icon={<ZoomIn className="h-3 w-3" />}
                    onClick={handleZoomIn}
                    size="sm"
                    aria-label="Zoom in"
                />
            </div>

            {/* Component Palette */}
            <div className="w-48 overflow-hidden border-r border-white/10 bg-gray-800">
                <ComponentPalette onDragStart={setDraggingComponent} />
            </div>

            {/* Canvas */}
            <div className="relative flex-1 bg-gray-900">
                {/* Simulation controls overlay */}
                <div className="absolute right-2 top-2 z-10">
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
