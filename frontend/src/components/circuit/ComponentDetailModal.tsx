'use client';

import { useRef, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { ComponentDefinition } from '@/constants/components';
import { getComponentDetail } from '@/constants/componentDetails';
import { getExampleCircuit } from '@/constants/exampleCircuits';
import { MiniCanvas } from './MiniCanvas';
import { drawComponentSymbol } from './drawingUtils';

interface ComponentDetailModalProps {
    component: ComponentDefinition | null;
    isOpen: boolean;
    onClose: () => void;
}

function ComponentIcon({ type, size = 48 }: { type: string; size?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Clear and draw background
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, 8);
        ctx.fill();

        // Draw component symbol centered
        // Pass 'HIGH' signal for LEDs to show their color
        const signalState = type.startsWith('LED_') ? 'HIGH' : undefined;
        ctx.save();
        ctx.translate(size / 2, size / 2);
        drawComponentSymbol(ctx, type, size * 0.7, size * 0.7, true, signalState);
        ctx.restore();
    }, [type, size]);

    return (
        <canvas ref={canvasRef} width={size} height={size} className="flex-shrink-0 rounded-lg" />
    );
}

export function ComponentDetailModal({ component, isOpen, onClose }: ComponentDetailModalProps) {
    if (!component) return null;

    const detail = getComponentDetail(component.type);

    const modalTitle = (
        <div className="flex items-center gap-3">
            <ComponentIcon type={component.type} size={40} />
            <span>{component.name}</span>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="2xl">
            <div className="space-y-4">
                {/* Category Badge */}
                <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {component.category}
                    </span>
                </div>

                {/* Short Description */}
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {detail?.shortDescription || component.description}
                </p>

                {/* Full Description */}
                {detail?.fullDescription && (
                    <div className="rounded-lg border border-gray-200 bg-gray-100 p-3 dark:border-gray-600 dark:bg-gray-700">
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            {detail.fullDescription}
                        </p>
                    </div>
                )}

                {/* Truth Table */}
                {detail?.truthTable && (
                    <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Truth Table
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                        {detail.truthTable.inputLabels.map((label, i) => (
                                            <th
                                                key={`in-${i}`}
                                                className="px-4 py-2 text-center font-semibold text-green-600 dark:text-green-400"
                                            >
                                                {label}
                                            </th>
                                        ))}
                                        <th className="px-3 py-2 text-gray-400">→</th>
                                        {detail.truthTable.outputLabels.map((label, i) => (
                                            <th
                                                key={`out-${i}`}
                                                className="px-4 py-2 text-center font-semibold text-red-600 dark:text-red-400"
                                            >
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.truthTable.rows.map((row, rowIndex) => (
                                        <tr
                                            key={rowIndex}
                                            className="border-t border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700/50"
                                        >
                                            {row.inputs.map((val, i) => (
                                                <td
                                                    key={`in-${i}`}
                                                    className="px-4 py-2 text-center font-mono"
                                                >
                                                    <TruthValue value={val} isOutput={false} />
                                                </td>
                                            ))}
                                            <td className="px-3 py-2"></td>
                                            {row.outputs.map((val, i) => (
                                                <td
                                                    key={`out-${i}`}
                                                    className="px-4 py-2 text-center font-mono"
                                                >
                                                    <TruthValue value={val} isOutput={true} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Interactive Example Circuit */}
                {(() => {
                    const exampleCircuit = getExampleCircuit(component.type);
                    if (!exampleCircuit) return null;
                    return (
                        <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Interactive Demo
                            </h4>
                            <div className="flex flex-col items-center">
                                <MiniCanvas
                                    blueprint={exampleCircuit.blueprint}
                                    width={380}
                                    height={180}
                                />
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    {exampleCircuit.description}
                                </p>
                            </div>
                        </div>
                    );
                })()}

                {/* Tips */}
                {detail?.tips && detail.tips.length > 0 && (
                    <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Tips
                        </h4>
                        <ul className="space-y-1.5">
                            {detail.tips.map((tip, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                                >
                                    <span className="mt-0.5 text-green-500">✓</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Related Components */}
                {detail?.relatedComponents && detail.relatedComponents.length > 0 && (
                    <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Related Components
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {detail.relatedComponents.map((relType) => (
                                <span
                                    key={relType}
                                    className="rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                >
                                    {relType.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pins - matches canvas pin colors exactly */}
                {component.pins && component.pins.length > 0 && (
                    <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Pins ({component.pins.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {component.pins.map((pin, index) => (
                                <span
                                    key={`${pin.name}-${index}`}
                                    className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                                        pin.type === 'input'
                                            ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-700/50 dark:bg-green-900/30 dark:text-green-400'
                                            : 'border-red-200 bg-red-100 text-red-700 dark:border-red-700/50 dark:bg-red-900/30 dark:text-red-400'
                                    }`}
                                >
                                    {pin.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

// Truth table value with color coding
function TruthValue({ value, isOutput }: { value: string; isOutput: boolean }) {
    if (value === '0') {
        return <span className="text-gray-400">0</span>;
    }
    if (value === '1') {
        return (
            <span className={`font-bold ${isOutput ? 'text-red-500' : 'text-green-500'}`}>1</span>
        );
    }
    if (value === '↑') {
        return <span className="text-blue-500">↑</span>;
    }
    if (value.includes('Toggle')) {
        return <span className="text-xs font-medium text-amber-500">Toggle</span>;
    }
    if (value.includes('Q₀') || value.includes('Hold')) {
        return <span className="text-xs italic text-gray-400">Hold</span>;
    }
    if (value === '?') {
        return <span className="text-red-500">✗</span>;
    }
    if (value === 'X' || value === '-') {
        return <span className="text-gray-400">—</span>;
    }
    return <span className="text-gray-600 dark:text-gray-300">{value}</span>;
}
