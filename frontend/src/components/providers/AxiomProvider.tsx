'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { logPageView } from '@/lib/axiom/client';

export function AxiomProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const lastLoggedPath = useRef<string | null>(null);

    // Log page views on route changes (prevent duplicate logs in StrictMode)
    useEffect(() => {
        if (lastLoggedPath.current !== pathname) {
            lastLoggedPath.current = pathname;
            logPageView(pathname);
        }
    }, [pathname]);

    return <>{children}</>;
}
