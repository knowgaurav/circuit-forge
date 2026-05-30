'use client';

import { useEffect, useState } from 'react';

import clsx from 'clsx';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

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
    success: 'bg-success/10 text-success border-success/30',
    error: 'bg-error/10 text-error border-error/30',
    info: 'bg-primary/10 text-primary border-primary/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
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
                'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg',
                'transition-all duration-300',
                styles[type],
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            )}
            role="alert"
            aria-live="polite"
        >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <p className="flex-1 text-sm">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="rounded p-1 transition-colors hover:bg-black/5"
                aria-label="Dismiss notification"
            >
                <X className="h-4 w-4" />
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
