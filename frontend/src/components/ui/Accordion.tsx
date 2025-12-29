'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface AccordionItemProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
}

export function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-gray-200 last:border-b-0">
            <button
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span className="text-sm font-medium text-gray-900">{title}</span>
                <ChevronDown
                    className={clsx(
                        'w-4 h-4 text-gray-500 transition-transform duration-200',
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
        <div className={clsx('bg-white rounded-lg border border-gray-200', className)}>
            {children}
        </div>
    );
}
