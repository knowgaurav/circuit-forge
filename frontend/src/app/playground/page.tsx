'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    MousePointer2, Hand, Pencil, Eraser, Undo2, Redo2,
    Download, Upload, Image, Spline, Trash2, ArrowLeft,
    ZoomIn, ZoomOut, ChevronDown, RotateCcw, Save, FolderOpen
} from 'lucide-react';

import {
    Button, IconButton, Modal, Badge,
    ColorPicker, Tooltip, ToastContainer, ToastItem,
    ThemeToggle, Input
} from '@/components/ui';
import { Canvas, SimulationOverlay } from '@/components/circuit';
import { ComponentPalette } from '@/components/circuit/ComponentPalette';
import { createComponentInstance, ComponentDefinition } from '@/constants/components';
import { useCircuitStore, useUIStore, Tool } from '@/stores';
import { exportAsPng, exportAsJson, importFromJson } from '@/services/export';
import type { SimulationResult } from '@/services/simulation';
import type { Position, Annotation, CircuitState } from '@/types';

const PLAYGROUND_AUTOSAVE_KEY = 'circuitforge_playground_autosave';
const SAVED_CIRCUITS_KEY = 'circuitforge_saved_circuits';

interface SavedCircuit {
    id: string;
    name: string;
    savedAt: string;
    state: CircuitState;
}

export default function PlaygroundPage() {
    const circuitStore = useCircuitStore();
    const uiStore = useUIStore();

    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [draggingComponent, setDraggingComponent] = useState<ComponentDefinition | null>(null);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isSimulationRunning, setIsSimulationRunning] = useState(false);
    const [showZoomDropdown, setShowZoomDropdown] = useState(false);

    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [savedCircuits, setSavedCircuits] = useState<SavedCircuit[]>([]);
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);

    // Sidebar state
    const [leftSidebarWidth, setLeftSidebarWidth] = useState(256);
    const [isResizing, setIsResizing] = useState(false);

    const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400];

    // Toast helper with deduplication
    const addToast = useCallback((type: ToastItem['type'], message: string) => {
        setToasts((prev) => {
            // Check if the same message already exists (prevent duplicates)
            const isDuplicate = prev.some((t) => t.message === message && t.type === type);
            if (isDuplicate) {
                return prev;
            }
            const id = `toast-${Date.now()}`;
            return [...prev, { id, type, message }];
        });
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Load saved circuits list
    const loadSavedCircuits = useCallback(() => {
        const saved = localStorage.getItem(SAVED_CIRCUITS_KEY);
        if (saved) {
            setSavedCircuits(JSON.parse(saved));
        }
    }, []);

    // Auto-save to localStorage
    const autoSave = useCallback(() => {
        const state: CircuitState = {
            sessionId: 'playground',
            version: circuitStore.version,
            schemaVersion: '1.0.0',
            components: circuitStore.components,
            wires: circuitStore.wires,
            annotations: circuitStore.annotations,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(PLAYGROUND_AUTOSAVE_KEY, JSON.stringify(state));
    }, [circuitStore.components, circuitStore.wires, circuitStore.annotations, circuitStore.version]);

    // Auto-save on changes
    useEffect(() => {
        if (circuitStore.components.length > 0 || circuitStore.wires.length > 0 || circuitStore.annotations.length > 0) {
            autoSave();
        }
    }, [circuitStore.components, circuitStore.wires, circuitStore.annotations, autoSave]);

    // Check for autosave on mount
    useEffect(() => {
        const autosaved = localStorage.getItem(PLAYGROUND_AUTOSAVE_KEY);
        if (autosaved) {
            const state = JSON.parse(autosaved) as CircuitState;
            if (state.components.length > 0 || state.wires.length > 0) {
                setShowRestorePrompt(true);
            }
        }
        loadSavedCircuits();

        return () => {
            circuitStore.reset();
            uiStore.reset();
        };
    }, []);

    const handleRestoreAutosave = () => {
        const autosaved = localStorage.getItem(PLAYGROUND_AUTOSAVE_KEY);
        if (autosaved) {
            const state = JSON.parse(autosaved) as CircuitState;
            circuitStore.setCircuitState(state);
            addToast('success', 'Previous work restored');
        }
        setShowRestorePrompt(false);
    };

    const handleDiscardAutosave = () => {
        localStorage.removeItem(PLAYGROUND_AUTOSAVE_KEY);
        setShowRestorePrompt(false);
    };

    // Sidebar resize handlers
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        const newWidth = Math.max(200, Math.min(400, e.clientX - 48));
        setLeftSidebarWidth(newWidth);
    }, [isResizing]);

    const handleResizeMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMouseMove);
            document.addEventListener('mouseup', handleResizeMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            return () => {
                document.removeEventListener('mousemove', handleResizeMouseMove);
                document.removeEventListener('mouseup', handleResizeMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
        return undefined;
    }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

    const handleToolSelect = (tool: Tool) => {
        uiStore.setSelectedTool(tool);
    };

    // Note: Undo/redo not implemented in playground (would need history tracking)
    const handleUndo = () => { /* TODO: implement undo */ };
    const handleRedo = () => { /* TODO: implement redo */ };

    const handleDeleteSelected = () => {
        if (uiStore.selectedComponentIds.length === 0) return;
        uiStore.selectedComponentIds.forEach((id: string) => {
            circuitStore.deleteComponent(id);
        });
        uiStore.clearSelection();
    };

    const handleZoomIn = () => {
        const currentPercent = Math.round(uiStore.zoom * 100);
        const nextPreset = ZOOM_PRESETS.find(p => p > currentPercent);
        if (nextPreset) uiStore.setZoom(nextPreset / 100);
    };

    const handleZoomOut = () => {
        const currentPercent = Math.round(uiStore.zoom * 100);
        const prevPreset = [...ZOOM_PRESETS].reverse().find(p => p < currentPercent);
        if (prevPreset) uiStore.setZoom(prevPreset / 100);
    };

    const handleZoomPreset = (percent: number) => {
        uiStore.setZoom(percent / 100);
        setShowZoomDropdown(false);
    };

    const handleComponentMove = (componentId: string, position: Position) => {
        circuitStore.moveComponent(componentId, position);
    };

    const handleAnnotationCreate = (annotation: Annotation) => {
        circuitStore.addAnnotation(annotation);
    };

    const handleComponentDrop = (position: Position) => {
        if (!draggingComponent) return;
        const existingLabels = circuitStore.components.map(c => c.label).filter(Boolean);
        const component = createComponentInstance(draggingComponent.type, position, existingLabels);
        if (component) {
            circuitStore.addComponent(component);
        }
        setDraggingComponent(null);
    };

    const handleWireCreate = (fromComponentId: string, fromPinId: string, toComponentId: string, toPinId: string) => {
        const wire = {
            id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fromComponentId,
            fromPinId,
            toComponentId,
            toPinId,
            waypoints: [],
        };
        circuitStore.addWire(wire);
    };

    const handleClearBoard = () => {
        circuitStore.reset();
        localStorage.removeItem(PLAYGROUND_AUTOSAVE_KEY);
        setShowClearConfirm(false);
        addToast('info', 'Board cleared');
    };

    const handleSaveCircuit = () => {
        if (!saveName.trim()) {
            addToast('error', 'Please enter a name');
            return;
        }
        const state: CircuitState = {
            sessionId: 'playground',
            version: circuitStore.version,
            schemaVersion: '1.0.0',
            components: circuitStore.components,
            wires: circuitStore.wires,
            annotations: circuitStore.annotations,
            updatedAt: new Date().toISOString(),
        };
        const newCircuit: SavedCircuit = {
            id: `circuit-${Date.now()}`,
            name: saveName.trim(),
            savedAt: new Date().toISOString(),
            state,
        };
        const updated = [...savedCircuits, newCircuit];
        localStorage.setItem(SAVED_CIRCUITS_KEY, JSON.stringify(updated));
        setSavedCircuits(updated);
        setSaveName('');
        setShowSaveModal(false);
        addToast('success', `Saved as "${newCircuit.name}"`);
    };

    const handleLoadCircuit = (circuit: SavedCircuit) => {
        circuitStore.setCircuitState(circuit.state);
        setShowLoadModal(false);
        addToast('success', `Loaded "${circuit.name}"`);
    };

    const handleDeleteSavedCircuit = (id: string) => {
        const updated = savedCircuits.filter(c => c.id !== id);
        localStorage.setItem(SAVED_CIRCUITS_KEY, JSON.stringify(updated));
        setSavedCircuits(updated);
        addToast('info', 'Circuit deleted');
    };

    const handleExportPng = async () => {
        try {
            await exportAsPng(
                circuitStore.components,
                circuitStore.wires,
                circuitStore.annotations,
                `playground-circuit.png`
            );
            addToast('success', 'Circuit exported as PNG');
        } catch {
            addToast('error', 'Failed to export PNG');
        }
    };

    const handleExportJson = () => {
        try {
            exportAsJson(
                {
                    sessionId: 'playground',
                    version: circuitStore.version,
                    schemaVersion: '1.0.0',
                    components: circuitStore.components,
                    wires: circuitStore.wires,
                    annotations: circuitStore.annotations,
                    updatedAt: new Date().toISOString(),
                },
                `playground-circuit.json`
            );
            addToast('success', 'Circuit exported as JSON');
        } catch {
            addToast('error', 'Failed to export JSON');
        }
    };

    const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const circuitState = await importFromJson(file);
            circuitStore.setCircuitState(circuitState);
            addToast('success', 'Circuit imported successfully');
        } catch (error) {
            addToast('error', error instanceof Error ? error.message : 'Failed to import circuit');
        }
        e.target.value = '';
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleRedo();
                    } else {
                        handleUndo();
                    }
                } else if (e.key === 'y') {
                    e.preventDefault();
                    handleRedo();
                } else if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    handleZoomIn();
                } else if (e.key === '-') {
                    e.preventDefault();
                    handleZoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    uiStore.setZoom(1);
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                handleDeleteSelected();
            } else if (e.key === 'Escape') {
                uiStore.clearSelection();
                uiStore.setSelectedTool('select');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [uiStore.selectedComponentIds]);

    return (
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between relative z-50">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-semibold text-gray-900 dark:text-white">Playground</h1>
                    <Badge variant="info">Free Practice</Badge>
                </div>

                <div className="flex items-center gap-2">
                    {/* Simulation Controls */}
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

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

                    {/* Save/Load */}
                    <Tooltip content="Save circuit" position="bottom">
                        <IconButton
                            icon={<Save className="w-4 h-4" />}
                            onClick={() => setShowSaveModal(true)}
                            aria-label="Save circuit"
                        />
                    </Tooltip>
                    <Tooltip content="My circuits" position="bottom">
                        <IconButton
                            icon={<FolderOpen className="w-4 h-4" />}
                            onClick={() => { loadSavedCircuits(); setShowLoadModal(true); }}
                            aria-label="Load circuit"
                        />
                    </Tooltip>

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

                    {/* Export/Import */}
                    <Tooltip content="Export as PNG" position="bottom">
                        <IconButton icon={<Image className="w-4 h-4" />} onClick={handleExportPng} aria-label="Export PNG" />
                    </Tooltip>
                    <Tooltip content="Export as JSON" position="bottom">
                        <IconButton icon={<Download className="w-4 h-4" />} onClick={handleExportJson} aria-label="Export JSON" />
                    </Tooltip>
                    <Tooltip content="Import JSON" position="bottom">
                        <label className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                            <Upload className="w-4 h-4" />
                        </label>
                    </Tooltip>

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

                    <Tooltip content="Clear board" position="bottom">
                        <IconButton
                            icon={<RotateCcw className="w-4 h-4" />}
                            onClick={() => setShowClearConfirm(true)}
                            variant="ghost"
                            aria-label="Clear board"
                        />
                    </Tooltip>
                    <ThemeToggle />
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Toolbar */}
                <div className="w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-2 gap-1">
                    <Tooltip content="Select (V)" position="right">
                        <IconButton
                            icon={<MousePointer2 className="w-5 h-5" />}
                            onClick={() => handleToolSelect('select')}
                            variant={uiStore.selectedTool === 'select' ? 'primary' : 'ghost'}
                            aria-label="Select tool"
                        />
                    </Tooltip>
                    <Tooltip content="Pan (Space)" position="right">
                        <IconButton
                            icon={<Hand className="w-5 h-5" />}
                            onClick={() => handleToolSelect('pan')}
                            variant={uiStore.selectedTool === 'pan' ? 'primary' : 'ghost'}
                            aria-label="Pan tool"
                        />
                    </Tooltip>
                    <Tooltip content="Draw (D)" position="right">
                        <IconButton
                            icon={<Pencil className="w-5 h-5" />}
                            onClick={() => handleToolSelect('draw')}
                            variant={uiStore.selectedTool === 'draw' ? 'primary' : 'ghost'}
                            aria-label="Draw tool"
                        />
                    </Tooltip>
                    <Tooltip content="Erase (E)" position="right">
                        <IconButton
                            icon={<Eraser className="w-5 h-5" />}
                            onClick={() => handleToolSelect('erase')}
                            variant={uiStore.selectedTool === 'erase' ? 'primary' : 'ghost'}
                            aria-label="Erase tool"
                        />
                    </Tooltip>
                    <Tooltip content="Wire (W)" position="right">
                        <IconButton
                            icon={<Spline className="w-5 h-5" />}
                            onClick={() => handleToolSelect('wire')}
                            variant={uiStore.selectedTool === 'wire' ? 'primary' : 'ghost'}
                            aria-label="Wire tool"
                        />
                    </Tooltip>

                    <div className="w-6 h-px bg-gray-200 dark:bg-gray-700 my-1" />

                    {/* Drawing options */}
                    {(uiStore.selectedTool === 'draw' || uiStore.selectedTool === 'erase') && (
                        <div className="flex flex-col items-center gap-1">
                            <ColorPicker
                                value={uiStore.selectedColor}
                                onChange={(color) => uiStore.setSelectedColor(color)}
                            />
                            <div className="flex flex-col gap-1 mt-1">
                                {[2, 4, 8].map((width) => (
                                    <button
                                        key={width}
                                        onClick={() => uiStore.setStrokeWidth(width as 2 | 4 | 8)}
                                        className={`w-6 h-6 rounded flex items-center justify-center ${uiStore.strokeWidth === width ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        <div className="rounded-full bg-current" style={{ width: width * 2, height: width * 2 }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1" />

                    {/* Undo/Redo */}
                    <Tooltip content="Undo (Ctrl+Z)" position="right">
                        <IconButton icon={<Undo2 className="w-5 h-5" />} onClick={handleUndo} aria-label="Undo" />
                    </Tooltip>
                    <Tooltip content="Redo (Ctrl+Y)" position="right">
                        <IconButton icon={<Redo2 className="w-5 h-5" />} onClick={handleRedo} aria-label="Redo" />
                    </Tooltip>

                    <div className="w-6 h-px bg-gray-200 dark:bg-gray-700 my-1" />

                    {/* Delete */}
                    <Tooltip content="Delete selected" position="right">
                        <IconButton
                            icon={<Trash2 className="w-5 h-5" />}
                            onClick={handleDeleteSelected}
                            disabled={uiStore.selectedComponentIds.length === 0}
                            variant="ghost"
                            aria-label="Delete"
                        />
                    </Tooltip>

                    {/* Zoom controls */}
                    <div className="relative mt-2">
                        <button
                            onClick={() => setShowZoomDropdown(!showZoomDropdown)}
                            className="text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded flex items-center gap-1"
                        >
                            {Math.round(uiStore.zoom * 100)}%
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showZoomDropdown && (
                            <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 min-w-[80px]">
                                {ZOOM_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => handleZoomPreset(preset)}
                                        className={`w-full text-left px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${Math.round(uiStore.zoom * 100) === preset ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}
                                    >
                                        {preset}%
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-1">
                        <IconButton icon={<ZoomOut className="w-4 h-4" />} onClick={handleZoomOut} size="sm" aria-label="Zoom out" />
                        <IconButton icon={<ZoomIn className="w-4 h-4" />} onClick={handleZoomIn} size="sm" aria-label="Zoom in" />
                    </div>
                </div>

                {/* Left Sidebar - Component Palette */}
                <div
                    className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col relative"
                    style={{ width: leftSidebarWidth }}
                >
                    <ComponentPalette
                        onDragStart={setDraggingComponent}
                    />
                    {/* Resize handle */}
                    <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
                        onMouseDown={handleResizeMouseDown}
                    />
                </div>

                {/* Canvas */}
                <div className="flex-1 relative">
                    <Canvas
                        simulationResult={simulationResult}
                        isSimulationRunning={isSimulationRunning}
                        onComponentMove={handleComponentMove}
                        onAnnotationCreate={handleAnnotationCreate}
                        onComponentDrop={handleComponentDrop}
                        onWireCreate={handleWireCreate}
                        onSwitchToggle={(componentId) => {
                            circuitStore.toggleSwitchState(componentId);
                        }}
                        draggingComponent={draggingComponent}
                    />
                </div>
            </div>

            {/* Restore Autosave Prompt */}
            <Modal
                isOpen={showRestorePrompt}
                onClose={handleDiscardAutosave}
                title="Restore Previous Work?"
            >
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You have unsaved work from a previous session. Would you like to restore it?
                </p>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleDiscardAutosave} className="flex-1">
                        Start Fresh
                    </Button>
                    <Button variant="primary" onClick={handleRestoreAutosave} className="flex-1">
                        Restore
                    </Button>
                </div>
            </Modal>

            {/* Clear Confirmation Modal */}
            <Modal
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                title="Clear Board?"
            >
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    This will remove all components, wires, and annotations. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setShowClearConfirm(false)} className="flex-1">
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleClearBoard} className="flex-1">
                        Clear Board
                    </Button>
                </div>
            </Modal>

            {/* Save Modal */}
            <Modal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                title="Save Circuit"
            >
                <div className="space-y-4">
                    <Input
                        label="Circuit Name"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="My Circuit"
                    />
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setShowSaveModal(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSaveCircuit} className="flex-1">
                            Save
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Load Modal */}
            <Modal
                isOpen={showLoadModal}
                onClose={() => setShowLoadModal(false)}
                title="My Circuits"
            >
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {savedCircuits.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                            No saved circuits yet
                        </p>
                    ) : (
                        savedCircuits.map((circuit) => (
                            <div
                                key={circuit.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{circuit.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(circuit.savedAt).toLocaleDateString()} • {circuit.state.components.length} components
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="primary" onClick={() => handleLoadCircuit(circuit)}>
                                        Load
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteSavedCircuit(circuit.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            {/* Toast notifications */}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
