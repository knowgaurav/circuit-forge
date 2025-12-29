'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, BookOpen, Wrench, Check, ChevronRight, ChevronLeft,
    Lightbulb, Play, RotateCcw, Eye, EyeOff, ZoomIn, ZoomOut, ChevronDown
} from 'lucide-react';
import { IconButton, Tooltip, Button, ThemeToggle } from '@/components/ui';
import { Canvas } from '@/components/circuit';
import { useCircuitStore, useUIStore } from '@/stores';
import { getTemplateById, type Template } from '@/constants/templates';
import { simulationEngine, type SimulationResult } from '@/services/simulation';

type Mode = 'learning' | 'implementation';

export default function TemplateDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const templateId = params.id as string;
    const mode = (searchParams.get('mode') as Mode) || 'learning';

    const [template, setTemplate] = useState<Template | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
    const [showHint, setShowHint] = useState(false);
    const [showTheory, setShowTheory] = useState(false);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [clockPhase, setClockPhase] = useState(0);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [showZoomDropdown, setShowZoomDropdown] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    // Zoom presets
    const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400];

    const circuitStore = useCircuitStore();
    const uiStore = useUIStore();

    // Sidebar resize handlers
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        setSidebarWidth(newWidth);
    }, [isResizing]);

    const handleResizeMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

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
    }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

    // Zoom handlers
    const handleZoomIn = useCallback(() => {
        const currentPercent = Math.round(uiStore.zoom * 100);
        const nextPreset = ZOOM_PRESETS.find(p => p > currentPercent);
        if (nextPreset) {
            uiStore.setZoom(nextPreset / 100);
        }
    }, [uiStore]);

    const handleZoomOut = useCallback(() => {
        const currentPercent = Math.round(uiStore.zoom * 100);
        const prevPreset = [...ZOOM_PRESETS].reverse().find(p => p < currentPercent);
        if (prevPreset) {
            uiStore.setZoom(prevPreset / 100);
        }
    }, [uiStore]);

    const handleResetZoom = useCallback(() => {
        uiStore.setZoom(1);
    }, [uiStore]);

    const handleZoomPreset = (percent: number) => {
        uiStore.setZoom(percent / 100);
        setShowZoomDropdown(false);
    };

    // Load template
    useEffect(() => {
        const t = getTemplateById(templateId);
        if (t) {
            setTemplate(t);
            if (mode === 'learning') {
                // Load complete circuit for learning mode
                circuitStore.setComponents(t.components);
                circuitStore.setWires(t.wires);
            } else {
                // Start with empty circuit for implementation mode
                circuitStore.reset();
            }
        } else {
            router.push('/templates');
        }

        return () => {
            circuitStore.reset();
            uiStore.reset();
        };
    }, [templateId, mode]);

    const currentStep = template?.steps[currentStepIndex];

    // Calculate progress for implementation mode
    const progress = useMemo(() => {
        if (!template) return 0;
        return Math.round((completedSteps.size / template.steps.length) * 100);
    }, [template, completedSteps]);

    // Get components and wires for current step (implementation mode)
    const stepComponents = useMemo(() => {
        if (!template || mode !== 'implementation') return [];
        const step = template.steps[currentStepIndex];
        if (!step) return [];
        return template.components.filter(c => step.components.includes(c.id));
    }, [template, currentStepIndex, mode]);

    const stepWires = useMemo(() => {
        if (!template || mode !== 'implementation') return [];
        const step = template.steps[currentStepIndex];
        if (!step) return [];
        return template.wires.filter(w => step.wires.includes(w.id));
    }, [template, currentStepIndex, mode]);

    const handleNextStep = () => {
        if (!template || currentStepIndex >= template.steps.length - 1) return;

        if (mode === 'implementation' && currentStep) {
            // Mark current step as completed
            setCompletedSteps(prev => {
                const newSet = new Set(prev);
                newSet.add(currentStep.id);
                return newSet;
            });

            // Add step components and wires to circuit
            stepComponents.forEach(comp => {
                if (!circuitStore.components.find(c => c.id === comp.id)) {
                    circuitStore.addComponent(comp);
                }
            });
            stepWires.forEach(wire => {
                if (!circuitStore.wires.find(w => w.id === wire.id)) {
                    circuitStore.addWire(wire);
                }
            });
        }

        setCurrentStepIndex(prev => prev + 1);
        setShowHint(false);
    };

    const handlePrevStep = () => {
        if (currentStepIndex <= 0) return;
        setCurrentStepIndex(prev => prev - 1);
        setShowHint(false);
    };

    // Run simulation with current state
    const runSimulation = useCallback(() => {
        // Inject clock phase into clock components and counter state
        const componentsWithState = circuitStore.components.map(comp => {
            if (comp.type === 'CLOCK') {
                return {
                    ...comp,
                    properties: { ...comp.properties, phase: clockPhase },
                };
            }
            if (comp.type === 'COUNTER_4BIT') {
                return {
                    ...comp,
                    properties: { ...comp.properties, _count: clockPhase },
                };
            }
            if (comp.type === 'SHIFT_REGISTER_8BIT') {
                return {
                    ...comp,
                    properties: { ...comp.properties, _shiftValue: clockPhase },
                };
            }
            if (comp.type === 'TRAFFIC_LIGHT_CTRL') {
                return {
                    ...comp,
                    properties: { ...comp.properties, _count: clockPhase },
                };
            }
            return comp;
        });

        const result = simulationEngine.simulate({
            sessionId: '',
            version: 0,
            schemaVersion: '1.0.0',
            components: componentsWithState,
            wires: circuitStore.wires,
            annotations: [],
            updatedAt: new Date().toISOString(),
        });
        setSimulationResult(result);
    }, [circuitStore.components, circuitStore.wires, clockPhase]);

    // Re-run simulation when components/wires change while simulating
    useEffect(() => {
        if (isSimulating) {
            runSimulation();
        }
    }, [isSimulating, circuitStore.components, circuitStore.wires, runSimulation]);

    // Clock tick for clock components
    useEffect(() => {
        if (!isSimulating) return;

        const interval = setInterval(() => {
            setClockPhase(prev => prev + 1);
        }, 1000); // 1Hz clock - slower for better visibility

        return () => clearInterval(interval);
    }, [isSimulating]);

    // Re-run simulation on clock tick
    useEffect(() => {
        if (isSimulating) {
            runSimulation();
        }
    }, [clockPhase, isSimulating, runSimulation]);

    // Keyboard shortcuts for zoom
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    handleZoomIn();
                } else if (e.key === '-') {
                    e.preventDefault();
                    handleZoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    handleResetZoom();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleZoomIn, handleZoomOut, handleResetZoom]);

    const handleRunSimulation = () => {
        setIsSimulating(true);
        setClockPhase(0);
        runSimulation();
    };

    const handleStopSimulation = () => {
        setIsSimulating(false);
        setSimulationResult(null);
    };

    const handleReset = () => {
        if (mode === 'learning' && template) {
            circuitStore.setComponents(template.components);
            circuitStore.setWires(template.wires);
        } else {
            circuitStore.reset();
        }
        setCurrentStepIndex(0);
        setCompletedSteps(new Set());
        setSimulationResult(null);
        setIsSimulating(false);
        setClockPhase(0);
    };

    if (!template) {
        return (
            <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
                <p className="dark:text-gray-300">Loading template...</p>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/templates" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="font-semibold text-gray-900 dark:text-white">{template.name}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {mode === 'learning' ? 'Learning Mode' : 'Implementation Mode'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mode Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => router.push(`/templates/${templateId}?mode=learning`)}
                            className={`px-3 py-1 rounded text-sm ${mode === 'learning'
                                ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <BookOpen className="w-4 h-4 inline mr-1" />
                            Learn
                        </button>
                        <button
                            onClick={() => router.push(`/templates/${templateId}?mode=implementation`)}
                            className={`px-3 py-1 rounded text-sm ${mode === 'implementation'
                                ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <Wrench className="w-4 h-4 inline mr-1" />
                            Build
                        </button>
                    </div>

                    {/* Simulation Controls */}
                    {!isSimulating ? (
                        <Button variant="secondary" size="sm" onClick={handleRunSimulation}>
                            <Play className="w-4 h-4 mr-1" />
                            Simulate
                        </Button>
                    ) : (
                        <Button variant="danger" size="sm" onClick={handleStopSimulation}>
                            Stop
                        </Button>
                    )}

                    <Button variant="ghost" size="sm" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4" />
                    </Button>

                    <ThemeToggle />
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar - Steps/Info */}
                <div
                    className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden flex-shrink-0 transition-all duration-200 relative"
                    style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
                >
                    {!sidebarCollapsed && (
                        <>
                            {/* Resize handle */}
                            <div
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 bg-gray-200 dark:bg-gray-700 opacity-0 hover:opacity-100 transition-opacity z-10"
                                onMouseDown={handleResizeMouseDown}
                            />
                            {/* Progress (Implementation Mode) */}
                            {mode === 'implementation' && (
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{progress}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Steps List */}
                            <div className="flex-1 overflow-y-auto p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                        {mode === 'learning' ? (
                                            <BookOpen className="w-4 h-4 text-white" />
                                        ) : (
                                            <Wrench className="w-4 h-4 text-white" />
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {mode === 'learning' ? 'Circuit Overview' : 'Implementation Steps'}
                                    </h3>
                                </div>

                                {mode === 'learning' ? (
                                    /* Learning Mode - Show overview and theory */
                                    <div className="space-y-5">
                                        {/* Description Card */}
                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{template.overview}</p>
                                        </div>

                                        {/* Theory Section */}
                                        {template.theory && (
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800 overflow-hidden">
                                                <button
                                                    onClick={() => setShowTheory(!showTheory)}
                                                    className="w-full flex items-center justify-between gap-2 p-4 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-800/30 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4" />
                                                        <span>Theory & Concepts</span>
                                                    </div>
                                                    {showTheory ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                                {showTheory && (
                                                    <div className="px-4 pb-4">
                                                        <pre className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed border border-blue-100 dark:border-blue-800">
                                                            {template.theory}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Components Section */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                </div>
                                                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Components Used</h4>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                                    {template.components.length}
                                                </span>
                                            </div>
                                            <div className="grid gap-2">
                                                {template.components.map((comp, index) => (
                                                    <div
                                                        key={comp.id}
                                                        className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600 hover:border-gray-200 dark:hover:border-gray-500 transition-colors"
                                                    >
                                                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                                                            {index + 1}
                                                        </div>
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                            {comp.type.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Implementation Mode - Show steps */
                                    <div className="space-y-2">
                                        {template.steps.map((step, index) => (
                                            <button
                                                key={step.id}
                                                onClick={() => setCurrentStepIndex(index)}
                                                className={`w-full text-left p-3 rounded-lg border transition-colors ${index === currentStepIndex
                                                    ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                                                    : completedSteps.has(step.id)
                                                        ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/30'
                                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${completedSteps.has(step.id)
                                                            ? 'bg-green-500 text-white'
                                                            : index === currentStepIndex
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                                            }`}
                                                    >
                                                        {completedSteps.has(step.id) ? (
                                                            <Check className="w-3 h-3" />
                                                        ) : (
                                                            index + 1
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                                                        {step.title}
                                                    </span>
                                                </div>
                                                {index === currentStepIndex && (
                                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 ml-8">
                                                        {step.description}
                                                    </p>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Step Navigation (Implementation Mode) */}
                            {mode === 'implementation' && currentStep && (
                                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                                    {currentStep.hint && (
                                        <button
                                            onClick={() => setShowHint(!showHint)}
                                            className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                                        >
                                            <Lightbulb className="w-4 h-4" />
                                            {showHint ? 'Hide Hint' : 'Show Hint'}
                                        </button>
                                    )}
                                    {showHint && currentStep.hint && (
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300">
                                            {currentStep.hint}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handlePrevStep}
                                            disabled={currentStepIndex === 0}
                                            className="flex-1"
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-1" />
                                            Previous
                                        </Button>
                                        {currentStepIndex < template.steps.length - 1 ? (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={handleNextStep}
                                                className="flex-1"
                                            >
                                                Next
                                                <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => {
                                                    if (currentStep) {
                                                        setCompletedSteps(prev => {
                                                            const newSet = new Set(prev);
                                                            newSet.add(currentStep.id);
                                                            return newSet;
                                                        });
                                                    }
                                                }}
                                                className="flex-1"
                                            >
                                                <Check className="w-4 h-4 mr-1" />
                                                Complete
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Sidebar collapse toggle */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute top-1/2 -translate-y-1/2 z-20 bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-r-md px-2 py-4 shadow-lg transition-colors"
                    style={{ left: sidebarCollapsed ? 0 : sidebarWidth }}
                    title={sidebarCollapsed ? 'Show Panel' : 'Hide Panel'}
                >
                    <span className="text-white text-sm font-bold">
                        {sidebarCollapsed ? '»' : '«'}
                    </span>
                </button>

                {/* Canvas */}
                <div className="flex-1 min-w-0 relative">
                    <Canvas
                        simulationResult={simulationResult}
                        isSimulationRunning={isSimulating}
                        onSwitchToggle={(componentId) => {
                            // Toggle switch state in the circuit store
                            circuitStore.toggleSwitchState(componentId);
                        }}
                    />

                    {/* Zoom Controls - Bottom Right */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-10">
                        <Tooltip content="Zoom Out (Ctrl+-)" position="top">
                            <IconButton
                                icon={<ZoomOut className="w-4 h-4" />}
                                onClick={handleZoomOut}
                                size="sm"
                                disabled={uiStore.zoom <= 0.25}
                                aria-label="Zoom out"
                            />
                        </Tooltip>

                        {/* Zoom Percentage Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowZoomDropdown(!showZoomDropdown)}
                                className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded min-w-[70px] justify-center"
                            >
                                {Math.round(uiStore.zoom * 100)}%
                                <ChevronDown className="w-3 h-3" />
                            </button>

                            {showZoomDropdown && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowZoomDropdown(false)}
                                    />
                                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[80px]">
                                        {ZOOM_PRESETS.map((percent) => (
                                            <button
                                                key={percent}
                                                onClick={() => handleZoomPreset(percent)}
                                                className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${Math.round(uiStore.zoom * 100) === percent
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                                                    : 'text-gray-700 dark:text-gray-200'
                                                    }`}
                                            >
                                                {percent}%
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <Tooltip content="Zoom In (Ctrl++)" position="top">
                            <IconButton
                                icon={<ZoomIn className="w-4 h-4" />}
                                onClick={handleZoomIn}
                                size="sm"
                                disabled={uiStore.zoom >= 4}
                                aria-label="Zoom in"
                            />
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* Completion Modal */}
            {progress === 100 && mode === 'implementation' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Congratulations!
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            You have successfully completed the {template.name} circuit!
                        </p>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={handleReset} className="flex-1">
                                Try Again
                            </Button>
                            <Button variant="primary" onClick={handleRunSimulation} className="flex-1">
                                <Play className="w-4 h-4 mr-1" />
                                Run Simulation
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
