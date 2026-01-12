/**
 * @file CategorySection.tsx
 * @description Collapsible category section for the component palette
 * @module components/circuit/ComponentPalette
 */

'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { ComponentDefinition } from '@/constants/components';
import { Tooltip } from '@/components/ui';
import { getComponentDetail } from '@/constants/componentDetails';
import { ComponentIcon } from './ComponentIcon';

interface CategorySectionProps {
    category: string;
    components: ComponentDefinition[];
    isExpanded: boolean;
    disabled: boolean | undefined;
    onToggle: () => void;
    onDragStart: (e: React.DragEvent, component: ComponentDefinition) => void;
    onInfoClick: (e: React.MouseEvent, component: ComponentDefinition) => void;
}

/**
 * Renders a collapsible category section containing component items.
 */
export function CategorySection({
    category,
    components,
    isExpanded,
    disabled,
    onToggle,
    onDragStart,
    onInfoClick,
}: CategorySectionProps): React.ReactElement {
    return (
        <div>
            {/* Category Header */}
            <button
                className="bg-surface-secondary/20 border-border/50 flex w-full items-center justify-between border-b px-3 py-2.5 transition-colors hover:bg-surface-secondary"
                onClick={onToggle}
            >
                <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {category}
                </span>
                <div className="flex items-center gap-2">
                    <span className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                        {components.length}
                    </span>
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-text-muted" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-text-muted" />
                    )}
                </div>
            </button>

            {/* Components Grid */}
            {isExpanded && (
                <div className="bg-background/50 grid grid-cols-2 gap-2 p-2">
                    {components.map((comp) => {
                        const detail = getComponentDetail(comp.type);
                        const tooltipContent = detail?.shortDescription || comp.description;

                        return (
                            <Tooltip key={comp.type} content={tooltipContent} position="right">
                                <div
                                    draggable={!disabled}
                                    onDragStart={(e) => onDragStart(e, comp)}
                                    className={`group relative flex min-h-[84px] cursor-grab flex-col items-center justify-center rounded-lg border-2 p-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:cursor-grabbing ${disabled
                                        ? 'cursor-not-allowed border-border bg-surface-secondary text-text-muted'
                                        : 'hover:bg-primary/5 hover:border-primary/30 border-border bg-surface text-foreground'
                                        } `}
                                >
                                    {/* Info button */}
                                    <button
                                        onClick={(e) => onInfoClick(e, comp)}
                                        className="absolute right-1 top-1 z-10 rounded-full p-1 text-text-muted opacity-0 transition-all hover:bg-surface-secondary hover:text-primary group-hover:opacity-100"
                                        title="View details"
                                    >
                                        <Info className="h-3.5 w-3.5" />
                                    </button>

                                    <div
                                        className={`mb-2 flex h-10 w-10 items-center justify-center rounded-md border shadow-sm transition-all duration-200 ${disabled
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
    );
}
