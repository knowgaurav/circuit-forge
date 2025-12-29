'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { COMPONENT_CATEGORIES, ComponentDefinition } from '@/constants/components';
import { Tooltip } from '@/components/ui';

interface ComponentPaletteProps {
    onDragStart: (component: ComponentDefinition) => void;
    disabled?: boolean;
}

export function ComponentPalette({ onDragStart, disabled }: ComponentPaletteProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(['Logic Gates', 'Input Devices'])
    );

    const toggleCategory = (category: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const handleDragStart = (e: React.DragEvent, component: ComponentDefinition) => {
        if (disabled) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('application/json', JSON.stringify(component));
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart(component);
    };

    return (
        <div className="h-full overflow-y-auto bg-white dark:bg-gray-800">
            {/* Header */}
            <div className="sticky top-0 z-10 px-3 py-2.5 bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Components</h3>
            </div>

            {/* Categories */}
            <div className="divide-y-2 divide-gray-100 dark:divide-gray-700">
                {Object.entries(COMPONENT_CATEGORIES).map(([category, components]) => (
                    <div key={category}>
                        {/* Category Header */}
                        <button
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700"
                            onClick={() => toggleCategory(category)}
                        >
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                {category}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                                    {components.length}
                                </span>
                                {expandedCategories.has(category) ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                            </div>
                        </button>

                        {/* Components Grid */}
                        {expandedCategories.has(category) && (
                            <div className="p-2 grid grid-cols-2 gap-2">
                                {components.map((comp) => (
                                    <Tooltip key={comp.type} content={comp.description} position="right">
                                        <div
                                            draggable={!disabled}
                                            onDragStart={(e) => handleDragStart(e, comp)}
                                            className={`
                                                flex flex-col items-center justify-center p-2 rounded-md border-2
                                                cursor-grab active:cursor-grabbing transition-all duration-150
                                                h-[72px] group
                                                ${disabled
                                                    ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 cursor-not-allowed border-gray-200 dark:border-gray-600'
                                                    : 'bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 hover:border-blue-400 text-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600'
                                                }
                                            `}
                                        >
                                            <div className={`
                                                w-9 h-9 flex items-center justify-center rounded mb-1 border
                                                transition-all duration-150
                                                ${disabled
                                                    ? 'bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-400'
                                                    : 'bg-gray-50 dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-100 group-hover:bg-blue-100 dark:group-hover:bg-blue-700 group-hover:border-blue-300'
                                                }
                                            `}>
                                                <ComponentIcon type={comp.type} />
                                            </div>
                                            <span className="text-[10px] font-medium text-center leading-tight line-clamp-2">
                                                {comp.name}
                                            </span>
                                        </div>
                                    </Tooltip>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Professional SVG component icons
function ComponentIcon({ type }: { type: string }) {
    const iconClass = "w-6 h-6";

    // AND Gate
    if (type.startsWith('AND') || type.startsWith('NAND')) {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6h6c4 0 7 3 7 6s-3 6-7 6H4V6z" />
                {type.startsWith('NAND') && <circle cx="18" cy="12" r="2" fill="currentColor" />}
                <line x1="1" y1="9" x2="4" y2="9" />
                <line x1="1" y1="15" x2="4" y2="15" />
                <line x1={type.startsWith('NAND') ? "20" : "17"} y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // OR Gate
    if (type.startsWith('OR') || type.startsWith('NOR')) {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6c2 0 4 3 4 6s-2 6-4 6c6 0 10-2 13-6-3-4-7-6-13-6z" />
                {type.startsWith('NOR') && <circle cx="18" cy="12" r="2" fill="currentColor" />}
                <line x1="1" y1="9" x2="5" y2="9" />
                <line x1="1" y1="15" x2="5" y2="15" />
                <line x1={type.startsWith('NOR') ? "20" : "17"} y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // XOR Gate
    if (type.startsWith('XOR') || type.startsWith('XNOR')) {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 6c2 3 2 6 0 12" />
                <path d="M5 6c2 0 4 3 4 6s-2 6-4 6c6 0 10-2 13-6-3-4-7-6-13-6z" />
                {type.startsWith('XNOR') && <circle cx="19" cy="12" r="2" fill="currentColor" />}
                <line x1="1" y1="9" x2="6" y2="9" />
                <line x1="1" y1="15" x2="6" y2="15" />
                <line x1={type.startsWith('XNOR') ? "21" : "18"} y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // NOT Gate / Buffer
    if (type === 'NOT' || type === 'BUFFER') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6l12 6-12 6V6z" />
                {type === 'NOT' && <circle cx="18" cy="12" r="2" fill="currentColor" />}
                <line x1="1" y1="12" x2="4" y2="12" />
                <line x1={type === 'NOT' ? "20" : "16"} y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // LED
    if (type.startsWith('LED_')) {
        const color = type === 'LED_RED' ? '#EF4444' : type === 'LED_GREEN' ? '#22C55E' : type === 'LED_BLUE' ? '#3B82F6' : '#FBBF24';
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 8l8 4-8 4V8z" fill={color} fillOpacity="0.3" stroke={color} />
                <line x1="14" y1="7" x2="14" y2="17" stroke={color} />
                <line x1="16" y1="5" x2="19" y2="2" stroke={color} />
                <line x1="18" y1="7" x2="21" y2="5" stroke={color} />
                <line x1="1" y1="12" x2="6" y2="12" />
            </svg>
        );
    }

    // Toggle Switch
    if (type === 'SWITCH_TOGGLE') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="8" width="12" height="8" rx="1" fill="#E5E7EB" />
                <circle cx="8" cy="12" r="3" fill="#6B7280" />
                <line x1="8" y1="12" x2="14" y2="8" strokeWidth="2" />
                <line x1="16" y1="12" x2="22" y2="12" />
            </svg>
        );
    }

    // Push Button
    if (type === 'SWITCH_PUSH') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="8" fill="#DBEAFE" />
                <circle cx="12" cy="12" r="5" fill="#3B82F6" />
                <line x1="20" y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // Clock
    if (type === 'CLOCK') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="6" width="14" height="12" rx="1" />
                <path d="M6 14V10h3v4h3v-4h3" stroke="#3B82F6" strokeWidth="1.5" />
                <line x1="17" y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // VCC / Const High
    if (type === 'VCC_5V' || type === 'VCC_3V3' || type === 'CONST_HIGH') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                <circle cx="12" cy="12" r="8" fill="#DCFCE7" />
                <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#166534" fontWeight="bold">+V</text>
            </svg>
        );
    }

    // Ground / Const Low
    if (type === 'GROUND' || type === 'CONST_LOW') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="12" y1="4" x2="12" y2="12" />
                <line x1="6" y1="12" x2="18" y2="12" />
                <line x1="8" y1="15" x2="16" y2="15" />
                <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
        );
    }

    // Flip-Flops
    if (type.includes('FLIPFLOP') || type.includes('LATCH')) {
        const label = type === 'D_FLIPFLOP' ? 'D' : type === 'SR_LATCH' ? 'SR' : type === 'JK_FLIPFLOP' ? 'JK' : 'T';
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="4" width="16" height="16" />
                <text x="12" y="14" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">{label}</text>
                <line x1="1" y1="8" x2="4" y2="8" />
                <line x1="1" y1="16" x2="4" y2="16" />
                <line x1="20" y1="8" x2="23" y2="8" />
                <line x1="20" y1="16" x2="23" y2="16" />
            </svg>
        );
    }

    // Multiplexer
    if (type.includes('MUX')) {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4l12 4v8l-12 4V4z" />
                <text x="10" y="14" textAnchor="middle" fontSize="7" fill="currentColor" fontWeight="bold">MUX</text>
                <line x1="1" y1="8" x2="4" y2="8" />
                <line x1="1" y1="12" x2="4" y2="12" />
                <line x1="1" y1="16" x2="4" y2="16" />
                <line x1="16" y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // 7-Segment Display
    if (type === 'DISPLAY_7SEG') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="2" width="16" height="20" fill="#1F2937" rx="1" />
                <path d="M8 6h8M8 12h8M8 18h8M8 6v6M16 6v6M8 12v6M16 12v6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
        );
    }

    // Probe
    if (type === 'PROBE') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="16" cy="8" r="6" fill="#FEF3C7" />
                <line x1="12" y1="12" x2="4" y2="20" strokeWidth="2" />
                <circle cx="16" cy="8" r="3" fill="#F59E0B" />
            </svg>
        );
    }

    // Junction
    if (type === 'JUNCTION') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <line x1="1" y1="12" x2="8" y2="12" />
                <line x1="16" y1="12" x2="23" y2="12" />
                <line x1="12" y1="1" x2="12" y2="8" />
                <line x1="12" y1="16" x2="12" y2="23" />
            </svg>
        );
    }

    // Default box
    return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="6" width="16" height="12" rx="1" />
            <line x1="1" y1="10" x2="4" y2="10" />
            <line x1="1" y1="14" x2="4" y2="14" />
            <line x1="20" y1="12" x2="23" y2="12" />
        </svg>
    );
}
