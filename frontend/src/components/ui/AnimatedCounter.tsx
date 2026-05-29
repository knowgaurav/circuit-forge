'use client';

import { useEffect, useState } from 'react';

import { useInView } from '@/hooks';

import type { ReactNode } from 'react';

export interface AnimatedCounterProps {
    end: number;
    suffix?: string;
    duration?: number;
    label: string;
    icon?: ReactNode;
}

export function AnimatedCounter({
    end,
    suffix = '',
    duration = 2000,
    label,
    icon,
}: AnimatedCounterProps) {
    const [count, setCount] = useState(0);
    const [ref, isInView] = useInView<HTMLDivElement>({ threshold: 0.3, triggerOnce: true });

    useEffect(() => {
        if (!isInView) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setCount(end);
            return;
        }

        let startTime: number | null = null;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeOutQuart * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [isInView, end, duration]);

    return (
        <div ref={ref} className="flex flex-col items-center text-center">
            {icon && <div className="mb-2 text-primary">{icon}</div>}
            <div className="font-heading text-3xl font-bold text-foreground md:text-4xl">
                {count}
                <span className="text-primary">{suffix}</span>
            </div>
            <div className="mt-1 font-mono text-xs uppercase tracking-wider text-text-secondary">
                {label}
            </div>
        </div>
    );
}

export default AnimatedCounter;
