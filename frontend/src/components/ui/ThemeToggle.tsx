'use client';

import { Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/stores';
import { IconButton } from './IconButton';
import { Tooltip } from './Tooltip';

export function ThemeToggle() {
    const theme = useUIStore((s) => s.theme);
    const toggleTheme = useUIStore((s) => s.toggleTheme);

    return (
        <Tooltip content={theme === 'light' ? 'Dark mode' : 'Light mode'} position="bottom">
            <IconButton
                icon={theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                onClick={toggleTheme}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                variant="ghost"
            />
        </Tooltip>
    );
}
