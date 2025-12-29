'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    onClose: (id: string) => void;
}

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
};

const styles = {
    success: 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
    info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};

export function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);
    const Icon = icons[type];

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => onClose(id), 300);
            }, duration);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [duration, id, onClose]);

    return (
        <div
            className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
                'transition-all duration-300',
                styles[type],
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
            role="alert"
            aria-live="polite"
        >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm flex-1">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="p-1 hover:bg-black/5 rounded transition-colors"
                aria-label="Dismiss notification"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// Toast container for managing multiple toasts
export interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

export function ToastContainer({
    toasts,
    onClose,
}: {
    toasts: ToastItem[];
    onClose: (id: string) => void;
}) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onClose={onClose} />
            ))}
        </div>
    );
}
