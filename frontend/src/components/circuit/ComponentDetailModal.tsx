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
            size="lg"
        >
            <div className="space-y-4">
                {/* Category Badge - matches canvas amber/orange */}
                <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-[#F59E0B]/20 text-[#F59E0B] font-medium">
                        {component.category}
                    </span>
                </div>

                {/* Short Description */}
                <p className="text-sm text-[#e0e0e0] font-medium">
                    {detail?.shortDescription || component.description}
                </p>

                {/* Full Description - darker canvas-style box */}
                {detail?.fullDescription && (
                    <div className="p-3 bg-[#252535] rounded-lg border border-[#404055]">
                        <p className="text-sm text-[#c0c0d0] leading-relaxed">
                            {detail.fullDescription}
                        </p>
                    </div>
                )}

                {/* Truth Table */}
                {detail?.truthTable && (
                    <div>
                        <h4 className="text-xs font-semibold text-[#8a8aa0] uppercase tracking-wide mb-2">
                            Truth Table
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-[#404055]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#2a2a3a]">
                                        {detail.truthTable.inputLabels.map((label, i) => (
                                            <th key={`in-${i}`} className="px-4 py-2 text-center font-semibold text-[#22C55E]">
                                                {label}
                                            </th>
                                        ))}
                                        <th className="px-3 py-2 text-[#6a6a8a]">→</th>
                                        {detail.truthTable.outputLabels.map((label, i) => (
                                            <th key={`out-${i}`} className="px-4 py-2 text-center font-semibold text-[#EF4444]">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.truthTable.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-t border-[#2a2a3a] hover:bg-[#2a2a3a]/50">
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
                        <h4 className="text-xs font-semibold text-[#8a8aa0] uppercase tracking-wide mb-2">
                            Example Usage
                        </h4>
                        <div className="p-3 bg-[#F59E0B]/10 rounded-lg border border-[#F59E0B]/30">
                            <p className="text-sm text-[#e0e0e0]">
                                {detail.usageExample}
                            </p>
                        </div>
                    </div>
                )}

                {/* Tips */}
                {detail?.tips && detail.tips.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-[#8a8aa0] uppercase tracking-wide mb-2">
                            Tips
                        </h4>
                        <ul className="space-y-1.5">
                            {detail.tips.map((tip, i) => (
                                <li key={i} className="text-sm text-[#c0c0d0] flex items-start gap-2">
                                    <span className="text-[#22C55E] mt-0.5">✓</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Related Components */}
                {detail?.relatedComponents && detail.relatedComponents.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-[#8a8aa0] uppercase tracking-wide mb-2">
                            Related Components
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {detail.relatedComponents.map((relType) => (
                                <span key={relType} className="text-xs px-2.5 py-1 bg-[#2a2a3a] text-[#e0e0e0] rounded-md font-medium border border-[#404055]">
                                    {relType.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pins - matches canvas pin colors exactly */}
                {component.pins && component.pins.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-[#8a8aa0] uppercase tracking-wide mb-2">
                            Pins ({component.pins.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {component.pins.map((pin) => (
                                <span
                                    key={pin.id}
                                    className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                                        pin.type === 'input'
                                            ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30'
                                            : 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30'
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

// Truth table value with canvas-matching colors
function TruthValue({ value, isOutput }: { value: string; isOutput: boolean }) {
    if (value === '0') {
        return <span className="text-[#6a6a8a]">0</span>;
    }
    if (value === '1') {
        return <span className={`font-bold ${isOutput ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>1</span>;
    }
    if (value === '↑') {
        return <span className="text-[#3B82F6]">↑</span>;
    }
    if (value.includes('Toggle')) {
        return <span className="text-[#F59E0B] text-xs font-medium">Toggle</span>;
    }
    if (value.includes('Q₀') || value.includes('Hold')) {
        return <span className="text-[#8a8aa0] text-xs italic">Hold</span>;
    }
    if (value === '?') {
        return <span className="text-[#EF4444]">✗</span>;
    }
    if (value === 'X' || value === '-') {
        return <span className="text-[#5a5a7a]">—</span>;
    }
    return <span className="text-[#c0c0d0]">{value}</span>;
}
