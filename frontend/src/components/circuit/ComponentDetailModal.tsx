'use client';

import { Modal } from '@/components/ui';
import { ComponentDefinition } from '@/constants/components';
import { getComponentDetail } from '@/constants/componentDetails';

interface ComponentDetailModalProps {
    component: ComponentDefinition | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ComponentDetailModal({ component, isOpen, onClose }: ComponentDetailModalProps) {
    if (!component) return null;

    const detail = getComponentDetail(component.type);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={component.name}
            size="xl"
        >
            <div className="space-y-4">
                {/* Category Badge */}
                <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                        {component.category}
                    </span>
                </div>

                {/* Short Description */}
                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                    {detail?.shortDescription || component.description}
                </p>

                {/* Full Description */}
                {detail?.fullDescription && (
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            {detail.fullDescription}
                        </p>
                    </div>
                )}

                {/* Truth Table */}
                {detail?.truthTable && (
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Truth Table
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                        {detail.truthTable.inputLabels.map((label, i) => (
                                            <th key={`in-${i}`} className="px-4 py-2 text-center font-semibold text-green-600 dark:text-green-400">
                                                {label}
                                            </th>
                                        ))}
                                        <th className="px-3 py-2 text-gray-400">→</th>
                                        {detail.truthTable.outputLabels.map((label, i) => (
                                            <th key={`out-${i}`} className="px-4 py-2 text-center font-semibold text-red-600 dark:text-red-400">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.truthTable.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            {row.inputs.map((val, i) => (
                                                <td key={`in-${i}`} className="px-4 py-2 text-center font-mono">
                                                    <TruthValue value={val} isOutput={false} />
                                                </td>
                                            ))}
                                            <td className="px-3 py-2"></td>
                                            {row.outputs.map((val, i) => (
                                                <td key={`out-${i}`} className="px-4 py-2 text-center font-mono">
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

                {/* Usage Example - canvas amber accent */}
                {detail?.usageExample && (
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Example Usage
                        </h4>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/50">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {detail.usageExample}
                            </p>
                        </div>
                    </div>
                )}

                {/* Tips */}
                {detail?.tips && detail.tips.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Tips
                        </h4>
                        <ul className="space-y-1.5">
                            {detail.tips.map((tip, i) => (
                                <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Related Components */}
                {detail?.relatedComponents && detail.relatedComponents.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Related Components
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {detail.relatedComponents.map((relType) => (
                                <span key={relType} className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md font-medium border border-gray-200 dark:border-gray-600">
                                    {relType.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pins - matches canvas pin colors exactly */}
                {component.pins && component.pins.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Pins ({component.pins.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {component.pins.map((pin) => (
                                <span
                                    key={pin.id}
                                    className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                                        pin.type === 'input'
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700/50'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50'
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
        return <span className={`font-bold ${isOutput ? 'text-red-500' : 'text-green-500'}`}>1</span>;
    }
    if (value === '↑') {
        return <span className="text-blue-500">↑</span>;
    }
    if (value.includes('Toggle')) {
        return <span className="text-amber-500 text-xs font-medium">Toggle</span>;
    }
    if (value.includes('Q₀') || value.includes('Hold')) {
        return <span className="text-gray-400 text-xs italic">Hold</span>;
    }
    if (value === '?') {
        return <span className="text-red-500">✗</span>;
    }
    if (value === 'X' || value === '-') {
        return <span className="text-gray-400">—</span>;
    }
    return <span className="text-gray-600 dark:text-gray-300">{value}</span>;
}
