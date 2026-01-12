'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    BookOpen,
    Wrench,
    Check,
    ChevronRight,
    ChevronLeft,
    Lightbulb,
    Play,
    RotateCcw,
    Eye,
    EyeOff,
    ZoomIn,
    ZoomOut,
    ChevronDown,
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

    const handleResizeMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = Math.max(200, Math.min(500, e.clientX));
            setSidebarWidth(newWidth);
        },
        [isResizing]
    );

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
        const nextPreset = ZOOM_PRESETS.find((p) => p > currentPercent);
        if (nextPreset) {
            uiStore.setZoom(nextPreset / 100);
        }
    }, [uiStore]);

    const handleZoomOut = useCallback(() => {
        const currentPercent = Math.round(uiStore.zoom * 100);
        const prevPreset = [...ZOOM_PRESETS].reverse().find((p) => p < currentPercent);
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
        return template.components.filter((c) => step.components.includes(c.id));
    }, [template, currentStepIndex, mode]);

    const stepWires = useMemo(() => {
        if (!template || mode !== 'implementation') return [];
        const step = template.steps[currentStepIndex];
        if (!step) return [];
        return template.wires.filter((w) => step.wires.includes(w.id));
    }, [template, currentStepIndex, mode]);

    const handleNextStep = () => {
        if (!template || currentStepIndex >= template.steps.length - 1) return;

        if (mode === 'implementation' && currentStep) {
            // Mark current step as completed
            setCompletedSteps((prev) => {
                const newSet = new Set(prev);
                newSet.add(currentStep.id);
                return newSet;
            });

            // Add step components and wires to circuit
            stepComponents.forEach((comp) => {
                if (!circuitStore.components.find((c) => c.id === comp.id)) {
                    circuitStore.addComponent(comp);
                }
            });
            stepWires.forEach((wire) => {
                if (!circuitStore.wires.find((w) => w.id === wire.id)) {
                    circuitStore.addWire(wire);
                }
            });
        }

        setCurrentStepIndex((prev) => prev + 1);
        setShowHint(false);
    };

    const handlePrevStep = () => {
        if (currentStepIndex <= 0) return;
        setCurrentStepIndex((prev) => prev - 1);
        setShowHint(false);
    };

    // Run simulation with current state
    const runSimulation = useCallback(() => {
        // Inject clock phase into clock components and counter state
        const componentsWithState = circuitStore.components.map((comp) => {
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
            setClockPhase((prev) => prev + 1);
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
            <div className="flex min-h-screen items-center justify-center dark:bg-gray-900">
                <p className="dark:text-gray-300">Loading template...</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-gray-100 dark:bg-gray-900">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-4">
                    <Link
                        href="/templates"
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="font-semibold text-gray-900 dark:text-white">
                            {template.name}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {mode === 'learning' ? 'Learning Mode' : 'Implementation Mode'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mode Toggle */}
                    <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                        <button
                            onClick={() => router.push(`/templates/${templateId}?mode=learning`)}
                            className={`rounded px-3 py-1 text-sm ${
                                mode === 'learning'
                                    ? 'bg-white text-blue-600 shadow dark:bg-gray-600 dark:text-blue-400'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                            }`}
                        >
                            <BookOpen className="mr-1 inline h-4 w-4" />
                            Learn
                        </button>
                        <button
                            onClick={() =>
                                router.push(`/templates/${templateId}?mode=implementation`)
                            }
                            className={`rounded px-3 py-1 text-sm ${
                                mode === 'implementation'
                                    ? 'bg-white text-blue-600 shadow dark:bg-gray-600 dark:text-blue-400'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                            }`}
                        >
                            <Wrench className="mr-1 inline h-4 w-4" />
                            Build
                        </button>
                    </div>

                    {/* Simulation Controls */}
                    {!isSimulating ? (
                        <Button variant="secondary" size="sm" onClick={handleRunSimulation}>
                            <Play className="mr-1 h-4 w-4" />
                            Simulate
                        </Button>
                    ) : (
                        <Button variant="danger" size="sm" onClick={handleStopSimulation}>
                            Stop
                        </Button>
                    )}

                    <Button variant="ghost" size="sm" onClick={handleReset}>
                        <RotateCcw className="h-4 w-4" />
                    </Button>

                    <ThemeToggle />
                </div>
            </header>

            {/* Main Content */}
            <div className="relative flex flex-1 overflow-hidden">
                {/* Left Sidebar - Steps/Info */}
                <div
                    className="relative flex flex-shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-800"
                    style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
                >
                    {!sidebarCollapsed && (
                        <>
                            {/* Resize handle */}
                            <div
                                className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize bg-gray-200 opacity-0 transition-opacity hover:bg-blue-400 hover:opacity-100 dark:bg-gray-700"
                                onMouseDown={handleResizeMouseDown}
                            />
                            {/* Progress (Implementation Mode) */}
                            {mode === 'implementation' && (
                                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Progress
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {progress}%
                                        </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                        <div
                                            className="h-full bg-green-500 transition-all"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Steps List */}
                            <div className="flex-1 overflow-y-auto p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                                        {mode === 'learning' ? (
                                            <BookOpen className="h-4 w-4 text-white" />
                                        ) : (
                                            <Wrench className="h-4 w-4 text-white" />
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {mode === 'learning'
                                            ? 'Circuit Overview'
                                            : 'Implementation Steps'}
                                    </h3>
                                </div>

                                {mode === 'learning' ? (
                                    /* Learning Mode - Show overview and theory */
                                    <div className="space-y-5">
                                        {/* Description Card */}
                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/50">
                                            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                                {template.overview}
                                            </p>
                                        </div>

                                        {/* Theory Section */}
                                        {template.theory && (
                                            <div className="overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20">
                                                <button
                                                    onClick={() => setShowTheory(!showTheory)}
                                                    className="flex w-full items-center justify-between gap-2 p-4 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100/50 dark:text-blue-300 dark:hover:bg-blue-800/30"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="h-4 w-4" />
                                                        <span>Theory & Concepts</span>
                                                    </div>
                                                    {showTheory ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </button>
                                                {showTheory && (
                                                    <div className="px-4 pb-4">
                                                        <pre className="whitespace-pre-wrap rounded-lg border border-blue-100 bg-white/60 p-3 font-mono text-xs leading-relaxed text-gray-700 dark:border-blue-800 dark:bg-gray-800/60 dark:text-gray-300">
                                                            {template.theory}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Components Section */}
                                        <div>
                                            <div className="mb-3 flex items-center gap-2">
                                                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                </div>
                                                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    Components Used
                                                </h4>
                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                                                    {template.components.length}
                                                </span>
                                            </div>
                                            <div className="grid gap-2">
                                                {template.components.map((comp, index) => (
                                                    <div
                                                        key={comp.id}
                                                        className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5 transition-colors hover:border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:hover:border-gray-500"
                                                    >
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-medium text-white">
                                                            {index + 1}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                                                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                                                    index === currentStepIndex
                                                        ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30'
                                                        : completedSteps.has(step.id)
                                                          ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/30'
                                                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                                                            completedSteps.has(step.id)
                                                                ? 'bg-green-500 text-white'
                                                                : index === currentStepIndex
                                                                  ? 'bg-blue-500 text-white'
                                                                  : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        {completedSteps.has(step.id) ? (
                                                            <Check className="h-3 w-3" />
                                                        ) : (
                                                            index + 1
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {step.title}
                                                    </span>
                                                </div>
                                                {index === currentStepIndex && (
                                                    <p className="ml-8 mt-2 text-sm text-gray-600 dark:text-gray-400">
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
                                <div className="space-y-3 border-t border-gray-200 p-4 dark:border-gray-700">
                                    {currentStep.hint && (
                                        <button
                                            onClick={() => setShowHint(!showHint)}
                                            className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                                        >
                                            <Lightbulb className="h-4 w-4" />
                                            {showHint ? 'Hide Hint' : 'Show Hint'}
                                        </button>
                                    )}
                                    {showHint && currentStep.hint && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
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
                                            <ChevronLeft className="mr-1 h-4 w-4" />
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
                                                <ChevronRight className="ml-1 h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => {
                                                    if (currentStep) {
                                                        setCompletedSteps((prev) => {
                                                            const newSet = new Set(prev);
                                                            newSet.add(currentStep.id);
                                                            return newSet;
                                                        });
                                                    }
                                                }}
                                                className="flex-1"
                                            >
                                                <Check className="mr-1 h-4 w-4" />
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
                    className="absolute top-1/2 z-20 -translate-y-1/2 rounded-r-md border-0 bg-blue-500 px-2 py-4 text-white shadow-lg transition-colors hover:bg-blue-600"
                    style={{ left: sidebarCollapsed ? 0 : sidebarWidth }}
                    title={sidebarCollapsed ? 'Show Panel' : 'Hide Panel'}
                >
                    <span className="text-sm font-bold text-white">
                        {sidebarCollapsed ? '»' : '«'}
                    </span>
                </button>

                {/* Canvas */}
                <div className="relative min-w-0 flex-1">
                    <Canvas
                        simulationResult={simulationResult}
                        isSimulationRunning={isSimulating}
                        onSwitchToggle={(componentId) => {
                            // Toggle switch state in the circuit store
                            circuitStore.toggleSwitchState(componentId);
                        }}
                    />

                    {/* Zoom Controls - Bottom Right */}
                    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        <Tooltip content="Zoom Out (Ctrl+-)" position="top">
                            <IconButton
                                icon={<ZoomOut className="h-4 w-4" />}
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
                                className="flex min-w-[70px] items-center justify-center gap-1 rounded px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                {Math.round(uiStore.zoom * 100)}%
                                <ChevronDown className="h-3 w-3" />
                            </button>

                            {showZoomDropdown && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowZoomDropdown(false)}
                                    />
                                    <div className="absolute bottom-full left-1/2 z-20 mb-1 min-w-[80px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                        {ZOOM_PRESETS.map((percent) => (
                                            <button
                                                key={percent}
                                                onClick={() => handleZoomPreset(percent)}
                                                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                                    Math.round(uiStore.zoom * 100) === percent
                                                        ? 'bg-blue-50 font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
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
                                icon={<ZoomIn className="h-4 w-4" />}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="max-w-md rounded-lg bg-white p-6 text-center dark:bg-gray-800">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                            Congratulations!
                        </h2>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            You have successfully completed the {template.name} circuit!
                        </p>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={handleReset} className="flex-1">
                                Try Again
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleRunSimulation}
                                className="flex-1"
                            >
                                <Play className="mr-1 h-4 w-4" />
                                Run Simulation
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
