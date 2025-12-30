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
                    <Badge variant="default" size="sm">{component.category}</Badge>
                </div>

                {/* Short Description */}
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {detail?.shortDescription || component.description}
                </p>

                {/* Full Description */}
                {detail?.fullDescription && (
                    <div className="pt-2 border-t border-gray-200 dark:border-[#3d3d5c]">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            About
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {detail.fullDescription}
                        </p>
                    </div>
                )}

                {/* Truth Table */}
                {detail?.truthTable && (
                    <div className="pt-2 border-t border-gray-200 dark:border-[#3d3d5c]">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Truth Table
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-[#3d3d5c]">
                                        {detail.truthTable.inputLabels.map((label, i) => (
                                            <th key={`in-${i}`} className="px-3 py-1.5 text-center font-medium text-gray-700 dark:text-gray-300">
                                                {label}
                                            </th>
                                        ))}
                                        <th className="px-2 py-1.5 text-gray-400">→</th>
                                        {detail.truthTable.outputLabels.map((label, i) => (
                                            <th key={`out-${i}`} className="px-3 py-1.5 text-center font-medium text-blue-600 dark:text-blue-400">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.truthTable.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-t border-gray-100 dark:border-[#3d3d5c]">
                                            {row.inputs.map((val, i) => (
                                                <td key={`in-${i}`} className="px-3 py-1.5 text-center font-mono text-gray-700 dark:text-gray-300">
                                                    {val}
                                                </td>
                                            ))}
                                            <td className="px-2 py-1.5"></td>
                                            {row.outputs.map((val, i) => (
                                                <td key={`out-${i}`} className="px-3 py-1.5 text-center font-mono font-medium text-gray-900 dark:text-white">
                                                    {val}
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
                    <div className="pt-2 border-t border-gray-200 dark:border-[#3d3d5c]">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Example Usage
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {detail.usageExample}
                        </p>
                    </div>
                )}

                {/* Tips */}
                {detail?.tips && detail.tips.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-[#3d3d5c]">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Tips
                        </h4>
                        <ul className="space-y-1">
                            {detail.tips.map((tip, i) => (
                                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                    <span className="text-gray-400">•</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Related Components */}
                {detail?.relatedComponents && detail.relatedComponents.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-[#3d3d5c]">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Related
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                            {detail.relatedComponents.map((relType) => (
                                <span key={relType} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-[#3d3d5c] text-gray-600 dark:text-gray-300 rounded">
                                    {relType.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pins */}
                {component.pins && component.pins.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-[#3d3d5c]">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Pins ({component.pins.length})
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                            {component.pins.map((pin) => (
                                <span
                                    key={pin.id}
                                    className={`text-xs px-2 py-0.5 rounded ${
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
