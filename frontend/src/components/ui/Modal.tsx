'use client';

import { useEffect, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { IconButton } from './IconButton';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: ReactNode;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    const handleEscape = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal content */}
            <div
                className={clsx(
                    'relative bg-surface rounded-xl shadow-2xl border border-border/50 animate-in fade-in zoom-in-95 duration-200',
                    'max-h-[85vh] overflow-y-auto custom-scrollbar',
                    {
                        'w-full max-w-sm': size === 'sm',
                        'w-full max-w-md': size === 'md',
                        'w-full max-w-lg': size === 'lg',
                        'w-full max-w-xl': size === 'xl',
                        'w-full max-w-2xl': size === '2xl',
                    }
                )}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-surface/50 sticky top-0 backdrop-blur z-10">
                        <h2 id="modal-title" className="text-lg font-semibold text-foreground">
                            {title}
                        </h2>
                        <IconButton
                            icon={<X className="w-5 h-5" />}
                            onClick={onClose}
                            aria-label="Close modal"
                            variant="ghost"
                            size="sm"
                            className="text-text-muted hover:text-foreground"
                        />
                    </div>
                )}

                {/* Body */}-
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}
