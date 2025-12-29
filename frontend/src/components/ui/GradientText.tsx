'use client';

import { ReactNode } from 'react';

interface GradientTextProps {
    children: ReactNode;
    className?: string;
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
}

export function GradientText({ children, className = '', as: Component = 'span' }: GradientTextProps) {
    return (
        <Component className={`gradient-text ${className}`}>
            {children}
        </Component>
    );
}

export default GradientText;
