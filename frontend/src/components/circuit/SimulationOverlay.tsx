'use client';

import { useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, AlertCircle, X } from 'lucide-react';
import { Button, Badge, Tooltip } from '@/components/ui';
import { useCircuitStore } from '@/stores';
import { simulate, type SimulationResult, type SignalState } from '@/features/simulation';

interface SimulationOverlayProps {
    canSimulate: boolean; // true if user can run simulation (teacher or student with edit access)
    isRunning: boolean;
    remoteResult: SimulationResult | null;
    onStart?: () => void;
    onStop?: () => void;
    onSimulationResult?: (result: SimulationResult) => void;
    onSimulationStateChange?: (isRunning: boolean) => void;
}

export function SimulationOverlay({
    canSimulate,
    isRunning: externalIsRunning,
    remoteResult,
    onStart,
    onStop,
    onSimulationResult,
    onSimulationStateChange,
}: SimulationOverlayProps) {
    const [localIsRunning, setLocalIsRunning] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [clockPhase, setClockPhase] = useState(0);
    const [showErrors, setShowErrors] = useState(false);
    const [showAllErrors, setShowAllErrors] = useState(false);

    const components = useCircuitStore((s) => s.components);
    const wires = useCircuitStore((s) => s.wires);
    const annotations = useCircuitStore((s) => s.annotations);

    // Use external running state for non-simulators, local for those who can simulate
    const isRunning = canSimulate ? localIsRunning : externalIsRunning;

    // Use remote result for users who can't simulate
    useEffect(() => {
        if (!canSimulate && remoteResult) {
            setResult(remoteResult);
            onSimulationResult?.(remoteResult);
        }
    }, [canSimulate, remoteResult, onSimulationResult]);

    // Sync external running state for users who can't simulate
    useEffect(() => {
        if (!canSimulate) {
            onSimulationStateChange?.(externalIsRunning);
        }
    }, [canSimulate, externalIsRunning, onSimulationStateChange]);

    const runSimulation = useCallback(() => {
        if (!canSimulate) return; // Only users with simulation permission can run

        // Inject clock phase into clock components and counter state
        const componentsWithState = components.map((comp) => {
            if (comp.type === 'CLOCK') {
                return {
                    ...comp,
                    properties: { ...comp.properties, phase: clockPhase },
                };
            }
            if (comp.type === 'COUNTER_4BIT') {
                // Counter increments on each clock cycle
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

        const circuitState = {
            sessionId: '',
            version: 0,
            schemaVersion: '1.0.0',
            components: componentsWithState,
            wires,
            annotations,
            updatedAt: new Date().toISOString(),
        };

        const simResult = simulate(circuitState);
        setResult(simResult);
        onSimulationResult?.(simResult);

        if (!simResult.success && simResult.errors.length > 0) {
            setShowErrors(true);
        }
    }, [canSimulate, components, wires, annotations, clockPhase, onSimulationResult]);

    // Run simulation when circuit changes (if running and can simulate)
    useEffect(() => {
        if (canSimulate && localIsRunning) {
            runSimulation();
        }
    }, [canSimulate, localIsRunning, components, wires, runSimulation]);

    // Clock tick for clock components (only for users who can simulate)
    useEffect(() => {
        if (!canSimulate || !localIsRunning) return;

        const interval = setInterval(() => {
            setClockPhase((prev) => prev + 1);
        }, 500); // 2Hz clock

        return () => clearInterval(interval);
    }, [canSimulate, localIsRunning]);

    // Re-run simulation on clock tick (only for users who can simulate)
    useEffect(() => {
        if (canSimulate && localIsRunning) {
            runSimulation();
        }
    }, [clockPhase, canSimulate, localIsRunning, runSimulation]);

    const handleStart = () => {
        if (!canSimulate) return;
        setLocalIsRunning(true);
        onSimulationStateChange?.(true);
        onStart?.();
        runSimulation();
    };

    const handleStop = () => {
        if (!canSimulate) return;
        setLocalIsRunning(false);
        onSimulationStateChange?.(false);
        onStop?.();
        setResult(null);
        onSimulationResult?.(null as unknown as SimulationResult);
    };

    const handleReset = () => {
        if (!canSimulate) return;
        setClockPhase(0);
        if (localIsRunning) {
            runSimulation();
        }
    };

    // Deduplicate errors by message for accurate count
    const uniqueErrors =
        result?.errors.filter(
            (error, index, self) => index === self.findIndex((e) => e.message === error.message)
        ) ?? [];
    const errorCount = uniqueErrors.length;

    return (
        <div className="relative flex items-center gap-2">
            {/* Simulation Controls */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                {!isRunning ? (
                    <Tooltip
                        content={
                            canSimulate
                                ? 'Start Simulation'
                                : 'Request edit access to run simulation'
                        }
                        position="bottom"
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleStart}
                            disabled={!canSimulate}
                            className={
                                canSimulate
                                    ? 'text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
                                    : 'cursor-not-allowed text-gray-400'
                            }
                        >
                            <Play className="mr-1 h-4 w-4" />
                            Simulate
                        </Button>
                    </Tooltip>
                ) : (
                    <Tooltip
                        content={
                            canSimulate
                                ? 'Stop Simulation'
                                : 'Request edit access to control simulation'
                        }
                        position="bottom"
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleStop}
                            disabled={!canSimulate}
                            className={
                                canSimulate
                                    ? 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300'
                                    : 'cursor-not-allowed text-gray-400'
                            }
                        >
                            <Pause className="mr-1 h-4 w-4" />
                            Stop
                        </Button>
                    </Tooltip>
                )}

                {canSimulate && (
                    <Tooltip content="Reset Clock" position="bottom">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            disabled={!isRunning}
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                )}
            </div>

            {/* Status Indicator */}
            {isRunning && (
                <Badge variant={result?.success ? 'success' : 'danger'}>
                    {result?.success ? 'Running' : 'Errors'}
                </Badge>
            )}

            {/* Error Indicator */}
            {errorCount > 0 && (
                <Tooltip content={`${errorCount} simulation error(s)`} position="bottom">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowErrors(true)}
                        className="text-red-600"
                    >
                        <AlertCircle className="mr-1 h-4 w-4" />
                        {errorCount}
                    </Button>
                </Tooltip>
            )}

            {/* Error Panel */}
            {showErrors && result?.errors && result.errors.length > 0 && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-red-200 bg-red-50 p-3 shadow-lg dark:border-red-800 dark:bg-red-950">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-red-800 dark:text-red-300">
                            Simulation Errors
                        </span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowErrors(false);
                                setShowAllErrors(false);
                            }}
                            className="cursor-pointer rounded p-1 hover:bg-red-100 dark:hover:bg-red-800/50"
                        >
                            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                    </div>
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                        {(showAllErrors ? uniqueErrors : uniqueErrors.slice(0, 5)).map(
                            (error, i) => (
                                <div
                                    key={`${error.componentId}-${error.pinId}-${i}`}
                                    className="text-sm text-red-700 dark:text-red-300"
                                >
                                    • {error.message}
                                </div>
                            )
                        )}
                        {uniqueErrors.length > 5 && !showAllErrors && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowAllErrors(true);
                                }}
                                className="cursor-pointer text-sm text-red-500 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
                            >
                                +{uniqueErrors.length - 5} more errors
                            </button>
                        )}
                        {uniqueErrors.length > 5 && showAllErrors && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowAllErrors(false);
                                }}
                                className="cursor-pointer text-sm text-red-500 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
                            >
                                Show less
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Get wire color based on signal state
 */
export function getWireColor(state: SignalState): string {
    switch (state) {
        case 'HIGH':
            return '#22C55E'; // Green
        case 'LOW':
            return '#9CA3AF'; // Gray
        case 'UNDEFINED':
            return '#F59E0B'; // Amber
        case 'ERROR':
            return '#EF4444'; // Red
        default:
            return '#374151'; // Default gray
    }
}

/**
 * Get wire style based on signal state
 */
export function getWireStyle(state: SignalState): { color: string; dashed: boolean } {
    return {
        color: getWireColor(state),
        dashed: state === 'ERROR' || state === 'UNDEFINED',
    };
}

/**
 * Get LED color based on signal state
 */
export function getLedColor(state: SignalState, baseColor: string): string {
    if (state === 'HIGH') {
        // Bright version of the color
        switch (baseColor) {
            case 'red':
                return '#EF4444';
            case 'green':
                return '#22C55E';
            case 'yellow':
                return '#EAB308';
            case 'blue':
                return '#3B82F6';
            default:
                return '#22C55E';
        }
    }
    // Dim version
    return '#374151';
}
