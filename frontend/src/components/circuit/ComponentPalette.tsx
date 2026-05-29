'use client';

import { useState } from 'react';

import { ChevronDown, ChevronRight, Info } from 'lucide-react';

import { Tooltip } from '@/components/ui';

import { getComponentDetail } from '@/constants/componentDetails';
import { COMPONENT_CATEGORIES } from '@/constants/components';

import { ComponentDetailModal } from './ComponentDetailModal';

import type { ComponentDefinition } from '@/constants/components';

interface ComponentPaletteProps {
    onDragStart: (component: ComponentDefinition) => void;
    disabled?: boolean;
}

export function ComponentPalette({ onDragStart, disabled }: ComponentPaletteProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(['Logic Gates', 'Input Devices'])
    );
    const [selectedComponent, setSelectedComponent] = useState<ComponentDefinition | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleInfoClick = (e: React.MouseEvent, component: ComponentDefinition) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedComponent(component);
        setIsModalOpen(true);
    };

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
        <div className="custom-scrollbar h-full overflow-y-auto bg-surface">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-border bg-surface px-3 py-3 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">Components</h3>
            </div>

            {/* Categories */}
            <div className="divide-border/50 divide-y">
                {Object.entries(COMPONENT_CATEGORIES).map(([category, components]) => (
                    <div key={category}>
                        {/* Category Header */}
                        <button
                            className="bg-surface-secondary/20 border-border/50 flex w-full items-center justify-between border-b px-3 py-2.5 transition-colors hover:bg-surface-secondary"
                            onClick={() => toggleCategory(category)}
                        >
                            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                {category}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                                    {components.length}
                                </span>
                                {expandedCategories.has(category) ? (
                                    <ChevronDown className="h-4 w-4 text-text-muted" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-text-muted" />
                                )}
                            </div>
                        </button>

                        {/* Components Grid */}
                        {expandedCategories.has(category) && (
                            <div className="bg-background/50 grid grid-cols-2 gap-2 p-2">
                                {components.map((comp) => {
                                    const detail = getComponentDetail(comp.type);
                                    const tooltipContent =
                                        detail?.shortDescription || comp.description;

                                    return (
                                        <Tooltip
                                            key={comp.type}
                                            content={tooltipContent}
                                            position="right"
                                        >
                                            <div
                                                draggable={!disabled}
                                                onDragStart={(e) => handleDragStart(e, comp)}
                                                className={`group relative flex min-h-[84px] cursor-grab flex-col items-center justify-center rounded-lg border-2 p-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:cursor-grabbing ${
                                                    disabled
                                                        ? 'cursor-not-allowed border-border bg-surface-secondary text-text-muted'
                                                        : 'hover:bg-primary/5 hover:border-primary/30 border-border bg-surface text-foreground'
                                                } `}
                                            >
                                                {/* Info button */}
                                                <button
                                                    onClick={(e) => handleInfoClick(e, comp)}
                                                    className="absolute right-1 top-1 z-10 rounded-full p-1 text-text-muted opacity-0 transition-all hover:bg-surface-secondary hover:text-primary group-hover:opacity-100"
                                                    title="View details"
                                                >
                                                    <Info className="h-3.5 w-3.5" />
                                                </button>

                                                <div
                                                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-md border shadow-sm transition-all duration-200 ${
                                                        disabled
                                                            ? 'border-border bg-surface-secondary text-text-muted'
                                                            : 'group-hover:border-primary/30 group-hover:shadow-primary/5 border-border bg-white text-foreground dark:bg-gray-800'
                                                    } `}
                                                >
                                                    <ComponentIcon type={comp.type} />
                                                </div>
                                                <span className="max-w-full px-1 text-center text-[11px] font-medium leading-tight text-text-secondary transition-colors group-hover:text-foreground">
                                                    {comp.name}
                                                </span>
                                            </div>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Component Detail Modal */}
            <ComponentDetailModal
                component={selectedComponent}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}

// Professional SVG component icons - matching canvas schematic symbols
function ComponentIcon({ type }: { type: string }) {
    const iconClass = 'w-6 h-6';
    // Using explicit colors for components to maintain schematic look
    // but using CSS variables for key structural elements where possible

    // AND Gate - D-shape with flat back
    if (type.startsWith('AND') || type.startsWith('NAND')) {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <path
                    d="M4 5h8a7 7 0 0 1 0 14H4V5z"
                    className="fill-surface-secondary stroke-foreground"
                />
                {type.startsWith('NAND') && (
                    <circle cx="19" cy="12" r="2" fill="none" stroke="currentColor" />
                )}
                <line x1="1" y1="8" x2="4" y2="8" />
                <line x1="1" y1="16" x2="4" y2="16" />
                <line x1={type.startsWith('NAND') ? '21' : '19'} y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // OR Gate - curved back, pointed front
    if (type.startsWith('OR') || type.startsWith('NOR')) {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <path
                    d="M3 5c3 0 4 3 4 7s-1 7-4 7c8 0 14-3 16-7-2-4-8-7-16-7z"
                    className="fill-surface-secondary stroke-foreground"
                />
                {type.startsWith('NOR') && (
                    <circle cx="20" cy="12" r="2" fill="none" stroke="currentColor" />
                )}
                <line x1="1" y1="8" x2="5" y2="8" />
                <line x1="1" y1="16" x2="5" y2="16" />
                <line x1={type.startsWith('NOR') ? '22' : '19'} y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // XOR Gate - OR with extra curve
    if (type.startsWith('XOR') || type.startsWith('XNOR')) {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <path d="M2 5c2 3 2 7 0 14" />
                <path
                    d="M5 5c3 0 4 3 4 7s-1 7-4 7c8 0 14-3 16-7-2-4-8-7-16-7z"
                    className="fill-surface-secondary stroke-foreground"
                />
                {type.startsWith('XNOR') && (
                    <circle cx="21" cy="12" r="2" fill="none" stroke="currentColor" />
                )}
                <line x1="1" y1="8" x2="6" y2="8" />
                <line x1="1" y1="16" x2="6" y2="16" />
                <line x1={type.startsWith('XNOR') ? '23' : '21'} y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // NOT Gate / Buffer - triangle
    if (type === 'NOT' || type === 'BUFFER') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <path d="M4 5l13 7-13 7V5z" className="fill-surface-secondary stroke-foreground" />
                {type === 'NOT' && (
                    <circle cx="19" cy="12" r="2" fill="none" stroke="currentColor" />
                )}
                <line x1="1" y1="12" x2="4" y2="12" />
                <line x1={type === 'NOT' ? '21' : '17'} y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // Toggle Switch - SPST lever switch symbol
    if (type === 'SWITCH_TOGGLE') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <line x1="2" y1="12" x2="7" y2="12" />
                <circle cx="8" cy="12" r="2" fill="currentColor" />
                <line x1="8" y1="12" x2="16" y2="6" strokeWidth="2.5" />
                <circle cx="16" cy="12" r="2" fill="currentColor" />
                <line x1="17" y1="12" x2="22" y2="12" />
            </svg>
        );
    }

    // Push Button - normally open momentary
    if (type === 'SWITCH_PUSH') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <line x1="2" y1="14" x2="8" y2="14" />
                <circle cx="8" cy="14" r="2" fill="currentColor" />
                <line x1="8" y1="8" x2="16" y2="8" />
                <circle cx="16" cy="14" r="2" fill="currentColor" />
                <line x1="16" y1="14" x2="22" y2="14" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <path d="M9 5l3-2 3 2" fill="none" />
            </svg>
        );
    }

    // LED - diode symbol with light arrows
    if (type.startsWith('LED_')) {
        const color =
            type === 'LED_RED'
                ? '#EF4444'
                : type === 'LED_GREEN'
                  ? '#22C55E'
                  : type === 'LED_BLUE'
                    ? '#3B82F6'
                    : '#FBBF24';
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                <line x1="2" y1="12" x2="7" y2="12" stroke="currentColor" />
                <path d="M7 7l8 5-8 5V7z" fill={color} fillOpacity="0.3" stroke={color} />
                <line x1="15" y1="7" x2="15" y2="17" stroke={color} strokeWidth="2" />
                <line x1="17" y1="12" x2="22" y2="12" stroke="currentColor" />
                {/* Light arrows */}
                <line x1="12" y1="5" x2="15" y2="2" stroke={color} />
                <line x1="15" y1="5" x2="18" y2="2" stroke={color} />
                <path d="M14 2l1 0 0 1" stroke={color} fill="none" />
                <path d="M17 2l1 0 0 1" stroke={color} fill="none" />
            </svg>
        );
    }

    // Clock - square wave symbol
    if (type === 'CLOCK') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <rect
                    x="3"
                    y="5"
                    width="14"
                    height="14"
                    rx="2"
                    className="fill-primary/20 stroke-primary"
                />
                <path
                    d="M6 14V10h3v4h3v-4h3"
                    className="stroke-primary"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <line x1="17" y1="12" x2="22" y2="12" />
            </svg>
        );
    }

    // VCC / Const High - logic 1 indicator
    if (type === 'VCC_5V' || type === 'VCC_3V3' || type === 'CONST_HIGH') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <rect x="4" y="6" width="12" height="12" rx="2" fill="#DCFCE7" stroke="#22C55E" />
                <text
                    x="10"
                    y="15"
                    textAnchor="middle"
                    fontSize="10"
                    fill="#166534"
                    fontWeight="bold"
                >
                    1
                </text>
                <line x1="16" y1="12" x2="22" y2="12" stroke="#22C55E" />
                <line x1="4" y1="4" x2="16" y2="4" stroke="#22C55E" strokeWidth="3" />
            </svg>
        );
    }

    // Ground / Const Low - logic 0 indicator
    if (type === 'GROUND' || type === 'CONST_LOW') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <rect
                    x="4"
                    y="6"
                    width="12"
                    height="12"
                    rx="2"
                    className="fill-surface-secondary stroke-text-muted"
                />
                <text
                    x="10"
                    y="15"
                    textAnchor="middle"
                    fontSize="10"
                    className="fill-text-secondary"
                    fontWeight="bold"
                >
                    0
                </text>
                <line x1="16" y1="12" x2="22" y2="12" className="stroke-text-muted" />
                <line
                    x1="4"
                    y1="20"
                    x2="16"
                    y2="20"
                    className="stroke-text-muted"
                    strokeWidth="3"
                />
            </svg>
        );
    }

    // Flip-Flops - with clock edge symbol
    if (type.includes('FLIPFLOP') || type.includes('LATCH')) {
        const label =
            type === 'D_FLIPFLOP'
                ? 'D'
                : type === 'SR_LATCH'
                  ? 'SR'
                  : type === 'JK_FLIPFLOP'
                    ? 'JK'
                    : 'T';
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <rect x="4" y="4" width="16" height="16" fill="#FEF3C7" stroke="#D97706" />
                <line x1="12" y1="4" x2="12" y2="20" stroke="#F59E0B" strokeWidth="1" />
                <text
                    x="8"
                    y="13"
                    textAnchor="middle"
                    fontSize="7"
                    fill="#92400E"
                    fontWeight="bold"
                >
                    {label.charAt(0)}
                </text>
                <text
                    x="16"
                    y="13"
                    textAnchor="middle"
                    fontSize="7"
                    fill="#92400E"
                    fontWeight="bold"
                >
                    Q
                </text>
                {/* Clock edge symbol */}
                <path d="M4 16l3-3 0 6z" fill="none" stroke="#92400E" strokeWidth="1" />
            </svg>
        );
    }

    // Counter - shows counting indicator
    if (type === 'COUNTER_4BIT') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2" fill="#1E40AF" stroke="#1E3A8A" />
                <text
                    x="12"
                    y="12"
                    textAnchor="middle"
                    fontSize="6"
                    fill="#60A5FA"
                    fontWeight="bold"
                >
                    0→F
                </text>
                {/* Up arrow */}
                <path d="M12 18l0-4M10 16l2-2 2 2" stroke="#60A5FA" strokeWidth="1.5" fill="none" />
            </svg>
        );
    }

    // Shift Register - shows shifting boxes
    if (type === 'SHIFT_REGISTER_8BIT') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2" fill="#9A3412" stroke="#7C2D12" />
                {/* Shifting boxes */}
                <rect x="4" y="9" width="4" height="6" fill="none" stroke="#FDBA74" />
                <rect x="9" y="9" width="4" height="6" fill="none" stroke="#FDBA74" />
                <rect x="14" y="9" width="4" height="6" fill="none" stroke="#FDBA74" />
                {/* Arrow */}
                <path d="M4 18l14 0M16 16l2 2-2 2" stroke="#FDBA74" strokeWidth="1.5" fill="none" />
            </svg>
        );
    }

    // Adder - shows plus symbol
    if (type === 'ADDER_4BIT') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2" fill="#166534" stroke="#14532D" />
                {/* Plus symbol */}
                <line x1="8" y1="12" x2="16" y2="12" stroke="#86EFAC" strokeWidth="3" />
                <line x1="12" y1="8" x2="12" y2="16" stroke="#86EFAC" strokeWidth="3" />
            </svg>
        );
    }

    // Comparator - shows comparison symbols
    if (type === 'COMPARATOR_4BIT') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2" fill="#6B21A8" stroke="#581C87" />
                <text
                    x="12"
                    y="14"
                    textAnchor="middle"
                    fontSize="8"
                    fill="#D8B4FE"
                    fontWeight="bold"
                >
                    &lt;=&gt;
                </text>
            </svg>
        );
    }

    // Decoder - shows expansion lines
    if (type === 'DECODER_2TO4') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2" fill="#075985" stroke="#0C4A6E" />
                {/* Input to output expansion */}
                <line x1="5" y1="10" x2="9" y2="10" stroke="#7DD3FC" />
                <line x1="5" y1="14" x2="9" y2="14" stroke="#7DD3FC" />
                <line x1="9" y1="8" x2="9" y2="16" stroke="#7DD3FC" />
                <line x1="15" y1="6" x2="19" y2="6" stroke="#7DD3FC" />
                <line x1="15" y1="10" x2="19" y2="10" stroke="#7DD3FC" />
                <line x1="15" y1="14" x2="19" y2="14" stroke="#7DD3FC" />
                <line x1="15" y1="18" x2="19" y2="18" stroke="#7DD3FC" />
                <path d="M9 8l6-2M9 16l6 2" stroke="#7DD3FC" fill="none" />
            </svg>
        );
    }

    // Multiplexer - trapezoid with multiple inputs
    if (type.includes('MUX')) {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <path d="M4 4l14 3v10l-14 3V4z" fill="#F3E8FF" stroke="#7C3AED" />
                <line x1="1" y1="8" x2="4" y2="8" stroke="#9333EA" />
                <line x1="1" y1="12" x2="4" y2="12" stroke="#9333EA" />
                <line x1="1" y1="16" x2="4" y2="16" stroke="#9333EA" />
                <line x1="18" y1="12" x2="23" y2="12" stroke="#9333EA" />
                <text
                    x="11"
                    y="14"
                    textAnchor="middle"
                    fontSize="5"
                    fill="#7C3AED"
                    fontWeight="bold"
                >
                    MUX
                </text>
            </svg>
        );
    }

    // 7-Segment Display - with glowing segments
    if (type === 'DISPLAY_7SEG') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <rect x="4" y="2" width="16" height="20" fill="#111827" rx="2" stroke="#374151" />
                <path
                    d="M8 5h8M8 11h8M8 17h8"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M8 5v6M16 5v6M8 11v6M16 11v6"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </svg>
        );
    }

    // DIP Switch
    if (type === 'DIP_SWITCH_4') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                <rect x="2" y="6" width="20" height="12" rx="2" fill="#FDE68A" stroke="#D97706" />
                {/* 4 mini switches */}
                <rect x="4" y="9" width="3" height="6" fill="#FFF" stroke="#9CA3AF" />
                <rect x="4" y="9" width="3" height="3" fill="#374151" />
                <rect x="8" y="9" width="3" height="6" fill="#FFF" stroke="#9CA3AF" />
                <rect x="8" y="9" width="3" height="3" fill="#374151" />
                <rect x="12" y="9" width="3" height="6" fill="#FFF" stroke="#9CA3AF" />
                <rect x="12" y="9" width="3" height="3" fill="#374151" />
                <rect x="16" y="9" width="3" height="6" fill="#FFF" stroke="#9CA3AF" />
                <rect x="16" y="9" width="3" height="3" fill="#374151" />
            </svg>
        );
    }

    // Numeric Input
    if (type === 'NUMERIC_INPUT') {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2" fill="#BFDBFE" stroke="#3B82F6" />
                <rect x="4" y="6" width="12" height="10" fill="#1E3A8A" />
                <text
                    x="10"
                    y="14"
                    textAnchor="middle"
                    fontSize="8"
                    fill="#60A5FA"
                    fontWeight="bold"
                >
                    00
                </text>
                <path
                    d="M18 8l2-2 2 2M18 14l2 2 2-2"
                    stroke="#3B82F6"
                    strokeWidth="1.5"
                    fill="none"
                />
            </svg>
        );
    }

    // Probe
    if (type === 'PROBE') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <circle cx="16" cy="8" r="6" fill="#FEF3C7" stroke="#F59E0B" />
                <line x1="12" y1="12" x2="4" y2="20" strokeWidth="2.5" />
                <circle cx="16" cy="8" r="3" fill="#F59E0B" />
            </svg>
        );
    }

    // Junction
    if (type === 'JUNCTION') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <line x1="1" y1="12" x2="8" y2="12" />
                <line x1="16" y1="12" x2="23" y2="12" />
                <line x1="12" y1="1" x2="12" y2="8" />
                <line x1="12" y1="16" x2="12" y2="23" />
            </svg>
        );
    }

    // Resistor
    if (type === 'RESISTOR') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <line x1="1" y1="12" x2="5" y2="12" />
                <path d="M5 12l2-5 2 10 2-10 2 10 2-10 2 5" fill="none" />
                <line x1="17" y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // Capacitor
    if (type === 'CAPACITOR') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <line x1="1" y1="12" x2="10" y2="12" />
                <line x1="10" y1="6" x2="10" y2="18" strokeWidth="3" />
                <line x1="14" y1="6" x2="14" y2="18" strokeWidth="3" />
                <line x1="14" y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // Diode
    if (type === 'DIODE') {
        return (
            <svg
                className={iconClass}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <line x1="1" y1="12" x2="8" y2="12" />
                <path d="M8 6l8 6-8 6V6z" className="fill-surface-secondary" />
                <line x1="16" y1="6" x2="16" y2="18" strokeWidth="3" />
                <line x1="16" y1="12" x2="23" y2="12" />
            </svg>
        );
    }

    // Default box with label
    return (
        <svg
            className={iconClass}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
        >
            <rect x="4" y="5" width="16" height="14" rx="2" className="fill-surface-secondary" />
            <line x1="1" y1="9" x2="4" y2="9" />
            <line x1="1" y1="15" x2="4" y2="15" />
            <line x1="20" y1="12" x2="23" y2="12" />
        </svg>
    );
}
