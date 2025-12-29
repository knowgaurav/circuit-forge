'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useUIStore((s) => s.theme);
    const setTheme = useUIStore((s) => s.setTheme);

    useEffect(() => {
        // Initialize theme from localStorage or system preference
        const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = stored || (systemDark ? 'dark' : 'light');

        // Apply the theme class to document
        const html = document.documentElement;
        html.classList.remove('light', 'dark');
        html.classList.add(initialTheme);
        setTheme(initialTheme);
    }, [setTheme]);

    // Also sync when theme changes
    useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('light', 'dark');
        html.classList.add(theme);
    }, [theme]);

    return <>{children}</>;
}
