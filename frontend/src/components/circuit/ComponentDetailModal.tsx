'use client';

import { useRef, useEffect } from 'react';

import { Modal } from '@/components/ui';

import { getComponentDetail } from '@/constants/componentDetails';
import { getExampleCircuit } from '@/constants/exampleCircuits';

import { drawComponentSymbol } from './drawingUtils';
import { MiniCanvas } from './MiniCanvas';

import type { ComponentDefinition } from '@/constants/components';

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
                    <span className="border-accent/30 bg-accent/10 rounded border px-2 py-1 font-mono text-xs font-medium text-accent">
                        {component.category}
                    </span>
                </div>

                {/* Short Description */}
                <p className="text-sm font-medium text-text-secondary">
                    {detail?.shortDescription || component.description}
                </p>

                {/* Full Description */}
                {detail?.fullDescription && (
                    <div className="rounded-lg border border-border bg-surface-secondary p-3">
                        <p className="text-sm leading-relaxed text-text-secondary">
                            {detail.fullDescription}
                        </p>
                    </div>
                )}

                {/* Truth Table */}
                {detail?.truthTable && (
                    <div>
                        <h4 className="eyebrow mb-2">Truth Table</h4>
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-surface-secondary">
                                        {detail.truthTable.inputLabels.map((label, i) => (
                                            <th
                                                key={`in-${i}`}
                                                className="px-4 py-2 text-center font-semibold text-success"
                                            >
                                                {label}
                                            </th>
                                        ))}
                                        <th className="px-3 py-2 text-text-muted">→</th>
                                        {detail.truthTable.outputLabels.map((label, i) => (
                                            <th
                                                key={`out-${i}`}
                                                className="px-4 py-2 text-center font-semibold text-error"
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
                                            className="border-t border-border hover:bg-surface-secondary"
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
                            <h4 className="eyebrow mb-2">Interactive Demo</h4>
                            <div className="flex flex-col items-center">
                                <MiniCanvas
                                    blueprint={exampleCircuit.blueprint}
                                    width={380}
                                    height={180}
                                />
                                <p className="mt-2 text-xs text-text-muted">
                                    {exampleCircuit.description}
                                </p>
                            </div>
                        </div>
                    );
                })()}

                {/* Tips */}
                {detail?.tips && detail.tips.length > 0 && (
                    <div>
                        <h4 className="eyebrow mb-2">Tips</h4>
                        <ul className="space-y-1.5">
                            {detail.tips.map((tip, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-text-secondary"
                                >
                                    <span className="mt-0.5 text-success">✓</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Related Components */}
                {detail?.relatedComponents && detail.relatedComponents.length > 0 && (
                    <div>
                        <h4 className="eyebrow mb-2">Related Components</h4>
                        <div className="flex flex-wrap gap-2">
                            {detail.relatedComponents.map((relType) => (
                                <span
                                    key={relType}
                                    className="rounded-md border border-border bg-surface-secondary px-2.5 py-1 font-mono text-xs font-medium text-text-secondary"
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
                        <h4 className="eyebrow mb-2">Pins ({component.pins.length})</h4>
                        <div className="flex flex-wrap gap-2">
                            {component.pins.map((pin, index) => (
                                <span
                                    key={`${pin.name}-${index}`}
                                    className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                                        pin.type === 'input'
                                            ? 'border-success/30 bg-success/10 text-success'
                                            : 'border-error/30 bg-error/10 text-error'
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
        return <span className="text-text-muted">0</span>;
    }
    if (value === '1') {
        return <span className={`font-bold ${isOutput ? 'text-error' : 'text-success'}`}>1</span>;
    }
    if (value === '↑') {
        return <span className="text-primary">↑</span>;
    }
    if (value.includes('Toggle')) {
        return <span className="text-xs font-medium text-accent">Toggle</span>;
    }
    if (value.includes('Q₀') || value.includes('Hold')) {
        return <span className="text-xs italic text-text-muted">Hold</span>;
    }
    if (value === '?') {
        return <span className="text-error">✗</span>;
    }
    if (value === 'X' || value === '-') {
        return <span className="text-text-muted">—</span>;
    }
    return <span className="text-text-secondary">{value}</span>;
}
