'use client';

import { useState } from 'react';

import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

import type { ReactNode } from 'react';

export interface AccordionItemProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
}

export function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-border last:border-b-0">
            <button
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-secondary"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span className="text-sm font-medium text-foreground">{title}</span>
                <ChevronDown
                    className={clsx(
                        'h-4 w-4 text-text-muted transition-transform duration-200',
                        isOpen && 'rotate-180'
                    )}
                />
            </button>
            <div
                className={clsx(
                    'overflow-hidden transition-all duration-200',
                    isOpen ? 'max-h-96' : 'max-h-0'
                )}
            >
                <div className="px-4 pb-3">{children}</div>
            </div>
        </div>
    );
}

export interface AccordionProps {
    children: ReactNode;
    className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
    return (
        <div className={clsx('rounded-lg border border-border bg-surface', className)}>
            {children}
        </div>
    );
}
