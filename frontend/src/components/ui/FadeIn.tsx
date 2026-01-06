'use client';

import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import React from 'react';

interface FadeInProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    duration?: number;
    fullWidth?: boolean;
    once?: boolean;
}

export function FadeIn({
    children,
    className,
    delay = 0,
    direction = 'up',
    duration = 0.5,
    fullWidth = false,
    once = true,
}: FadeInProps) {
    const directions: Variants = {
        hidden: {
            opacity: 0,
            y: direction === 'up' ? 40 : direction === 'down' ? -40 : 0,
            x: direction === 'left' ? 40 : direction === 'right' ? -40 : 0,
        },
        visible: {
            opacity: 1,
            y: 0,
            x: 0,
            transition: {
                duration,
                ease: [0.25, 0.25, 0, 1], // Ease out cubic
                delay,
            },
        },
    };

    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once, margin: "-100px" }} // Trigger when 100px into view
            variants={direction === 'none' ? {
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { duration, delay } }
            } : directions}
            className={cn(fullWidth ? "w-full" : "", className)}
        >
            {children}
        </motion.div>
    );
}

export function StaggerContainer({ children, className, staggerChildren = 0.1, delayChildren = 0 }: { children: React.ReactNode, className?: string, staggerChildren?: number, delayChildren?: number }) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren,
                        delayChildren,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export const fadeInItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};
