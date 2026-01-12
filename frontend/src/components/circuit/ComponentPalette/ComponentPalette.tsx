/**
 * @file ComponentPalette.tsx
 * @description Refactored component palette using extracted sub-components
 * @module components/circuit/ComponentPalette
 */

'use client';

import { useState, useCallback } from 'react';
import { COMPONENT_CATEGORIES, ComponentDefinition } from '@/constants/components';
import { ComponentDetailModal } from '../ComponentDetailModal';
import { CategorySection } from './CategorySection';

interface ComponentPaletteProps {
    onDragStart: (component: ComponentDefinition) => void;
    disabled?: boolean;
}

/**
 * Component palette for selecting and dragging circuit components.
 */
export function ComponentPalette({ onDragStart, disabled }: ComponentPaletteProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(['Logic Gates', 'Input Devices'])
    );
    const [selectedComponent, setSelectedComponent] = useState<ComponentDefinition | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleInfoClick = useCallback((e: React.MouseEvent, component: ComponentDefinition) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedComponent(component);
        setIsModalOpen(true);
    }, []);

    const toggleCategory = useCallback((category: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    }, []);

    const handleDragStart = useCallback(
        (e: React.DragEvent, component: ComponentDefinition) => {
            if (disabled) {
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData('application/json', JSON.stringify(component));
            e.dataTransfer.effectAllowed = 'copy';
            onDragStart(component);
        },
        [disabled, onDragStart]
    );

    return (
        <div className="custom-scrollbar h-full overflow-y-auto bg-surface">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-border bg-surface px-3 py-3 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">Components</h3>
            </div>

            {/* Categories */}
            <div className="divide-border/50 divide-y">
                {Object.entries(COMPONENT_CATEGORIES).map(([category, components]) => (
                    <CategorySection
                        key={category}
                        category={category}
                        components={components}
                        isExpanded={expandedCategories.has(category)}
                        disabled={disabled}
                        onToggle={() => toggleCategory(category)}
                        onDragStart={handleDragStart}
                        onInfoClick={handleInfoClick}
                    />
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
