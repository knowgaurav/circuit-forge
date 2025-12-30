'use client';

import { useEffect, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { IconButton } from './IconButton';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
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
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal content */}
            <div
                className={clsx(
                    'relative bg-white dark:bg-gray-800 rounded-lg shadow-xl',
                    'max-h-[90vh] overflow-auto',
                    {
                        'w-full max-w-sm': size === 'sm',
                        'w-full max-w-md': size === 'md',
                        'w-full max-w-lg': size === 'lg',
                        'w-full max-w-xl': size === 'xl',
                    }
                )}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h2>
                        <IconButton
                            icon={<X className="w-5 h-5" />}
                            onClick={onClose}
                            aria-label="Close modal"
                            variant="ghost"
                            size="sm"
                        />
                    </div>
                )}

                {/* Body */}
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}
