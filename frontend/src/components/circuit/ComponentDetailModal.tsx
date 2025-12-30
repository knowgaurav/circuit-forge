'use client';

import { Modal, Badge } from '@/components/ui';
import { ComponentDefinition } from '@/constants/components';
import { getComponentDetail, ComponentDetail } from '@/constants/componentDetails';
import { Info, Lightbulb, Link2, Table } from 'lucide-react';

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
            <div className="space-y-6">
                {/* Header with icon and category */}
                <div className="flex items-start gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <ComponentPreview type={component.type} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="default">{component.category}</Badge>
                            <Badge variant="outline" className="text-xs">
                                {component.width}×{component.height}px
                            </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                            {detail?.shortDescription || component.description}
                        </p>
                    </div>
                </div>

                {/* Full Description */}
                <div>
                    <h4 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        <Info className="w-4 h-4 text-blue-500" />
                        Description
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                        {detail?.fullDescription || component.description}
                    </p>
                </div>

                {/* Truth Table */}
                {detail?.truthTable && (
                    <div>
                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            <Table className="w-4 h-4 text-purple-500" />
                            Truth Table
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                        {detail.truthTable.inputLabels.map((label, i) => (
                                            <th
                                                key={`in-${i}`}
                                                className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
                                            >
                                                {label}
                                            </th>
                                        ))}
                                        <th className="px-2 py-2 bg-gray-200 dark:bg-gray-600 border border-gray-200 dark:border-gray-600"></th>
                                        {detail.truthTable.outputLabels.map((label, i) => (
                                            <th
                                                key={`out-${i}`}
                                                className="px-3 py-2 text-center font-semibold text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/30"
                                            >
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.truthTable.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            {row.inputs.map((val, i) => (
                                                <td
                                                    key={`in-${i}`}
                                                    className="px-3 py-2 text-center font-mono border border-gray-200 dark:border-gray-600"
                                                >
                                                    <TruthValue value={val} />
                                                </td>
                                            ))}
                                            <td className="px-2 py-2 text-center text-gray-400 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                                                →
                                            </td>
                                            {row.outputs.map((val, i) => (
                                                <td
                                                    key={`out-${i}`}
                                                    className="px-3 py-2 text-center font-mono border border-gray-200 dark:border-gray-600 bg-blue-50/50 dark:bg-blue-900/20"
                                                >
                                                    <TruthValue value={val} />
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
                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            Usage Example
                        </h4>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                                {detail.usageExample}
                            </p>
                        </div>
                    </div>
                )}

                {/* Tips */}
                {detail?.tips && detail.tips.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Tips
                        </h4>
                        <ul className="space-y-1">
                            {detail.tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
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
                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            <Link2 className="w-4 h-4 text-gray-500" />
                            Related Components
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {detail.relatedComponents.map((relType) => (
                                <Badge key={relType} variant="outline" className="text-xs">
                                    {relType.replace(/_/g, ' ')}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pin Information */}
                {component.pins && component.pins.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Pins ({component.pins.length})
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {component.pins.map((pin) => (
                                <div
                                    key={pin.id}
                                    className={`
                                        flex items-center gap-2 px-2 py-1.5 rounded text-xs
                                        ${pin.type === 'input'
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                        }
                                    `}
                                >
                                    <span className={`w-2 h-2 rounded-full ${
                                        pin.type === 'input' ? 'bg-green-500' : 'bg-red-500'
                                    }`} />
                                    <span className="font-medium">{pin.name}</span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                        ({pin.type})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

// Truth table value styling
function TruthValue({ value }: { value: string }) {
    if (value === '0') {
        return <span className="text-gray-500">0</span>;
    }
    if (value === '1') {
        return <span className="text-green-600 dark:text-green-400 font-bold">1</span>;
    }
    if (value === '↑') {
        return <span className="text-blue-600 dark:text-blue-400">↑</span>;
    }
    if (value.includes('Toggle')) {
        return <span className="text-purple-600 dark:text-purple-400 text-xs">Toggle</span>;
    }
    if (value.includes('Q₀')) {
        return <span className="text-gray-500 text-xs italic">Hold</span>;
    }
    if (value === '?') {
        return <span className="text-red-500">⚠</span>;
    }
    if (value === 'X' || value === '-') {
        return <span className="text-gray-400">-</span>;
    }
    return <span>{value}</span>;
}

// Simple component preview icon
function ComponentPreview({ type }: { type: string }) {
    // Reuse the icon logic from ComponentPalette
    const iconClass = "w-10 h-10";

    if (type.startsWith('AND') || type.startsWith('NAND')) {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 5h8a7 7 0 0 1 0 14H4V5z" fill="#F3F4F6" className="dark:fill-gray-600" />
                {type.startsWith('NAND') && <circle cx="19" cy="12" r="2" fill="none" stroke="currentColor" />}
            </svg>
        );
    }

    if (type.startsWith('OR') || type.startsWith('NOR')) {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 5c3 0 4 3 4 7s-1 7-4 7c8 0 14-3 16-7-2-4-8-7-16-7z" fill="#F3F4F6" className="dark:fill-gray-600" />
                {type.startsWith('NOR') && <circle cx="20" cy="12" r="2" fill="none" stroke="currentColor" />}
            </svg>
        );
    }

    if (type === 'NOT' || type === 'BUFFER') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 5l13 7-13 7V5z" fill="#F3F4F6" className="dark:fill-gray-600" />
                {type === 'NOT' && <circle cx="19" cy="12" r="2" fill="none" stroke="currentColor" />}
            </svg>
        );
    }

    // Default icon
    return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="5" width="16" height="14" rx="2" fill="#F3F4F6" className="dark:fill-gray-600" />
        </svg>
    );
}
