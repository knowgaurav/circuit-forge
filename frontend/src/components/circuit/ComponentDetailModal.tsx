'use client';

import { Modal, Badge } from '@/components/ui';
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
            size="lg"
        >
            <div className="space-y-4">
                {/* Category Badge */}
                <div className="flex items-center gap-2">
                    <Badge variant="info" size="sm">{component.category}</Badge>
                </div>

                {/* Short Description */}
                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                    {detail?.shortDescription || component.description}
                </p>

                {/* Full Description */}
                {detail?.fullDescription && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
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
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#3d3d5c]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-[#3d3d5c]">
                                        {detail.truthTable.inputLabels.map((label, i) => (
                                            <th key={`in-${i}`} className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-200">
                                                {label}
                                            </th>
                                        ))}
                                        <th className="px-3 py-2 text-gray-400 dark:text-gray-500">→</th>
                                        {detail.truthTable.outputLabels.map((label, i) => (
                                            <th key={`out-${i}`} className="px-4 py-2 text-center font-semibold text-blue-600 dark:text-blue-400">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.truthTable.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-t border-gray-100 dark:border-[#3d3d5c] hover:bg-gray-50 dark:hover:bg-[#353550]">
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

                {/* Usage Example */}
                {detail?.usageExample && (
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Example Usage
                        </h4>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
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
                                    <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
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
                                <span key={relType} className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-[#3d3d5c] text-gray-700 dark:text-gray-200 rounded-md font-medium">
                                    {relType.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pins */}
                {component.pins && component.pins.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Pins ({component.pins.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {component.pins.map((pin) => (
                                <span
                                    key={pin.id}
                                    className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                                        pin.type === 'input'
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
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
        return <span className="text-gray-400 dark:text-gray-500">0</span>;
    }
    if (value === '1') {
        return <span className={`font-bold ${isOutput ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-white'}`}>1</span>;
    }
    if (value === '↑') {
        return <span className="text-blue-500 dark:text-blue-400">↑</span>;
    }
    if (value.includes('Toggle')) {
        return <span className="text-purple-600 dark:text-purple-400 text-xs font-medium">Toggle</span>;
    }
    if (value.includes('Q₀') || value.includes('Hold')) {
        return <span className="text-gray-500 dark:text-gray-400 text-xs italic">Hold</span>;
    }
    if (value === '?') {
        return <span className="text-red-500 dark:text-red-400">✗</span>;
    }
    if (value === 'X' || value === '-') {
        return <span className="text-gray-300 dark:text-gray-600">—</span>;
    }
    return <span className="text-gray-700 dark:text-gray-300">{value}</span>;
}
