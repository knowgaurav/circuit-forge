import { Chakra_Petch, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';

import './globals.css';
import { FloatingLLMButton } from '@/components/ui/FloatingLLMButton';

import { AxiomProvider } from '@/components/providers/AxiomProvider';
import { ThemeProvider } from '@/components/ui';

import type { Metadata } from 'next';

// Display: squared, technical headline face
const chakra = Chakra_Petch({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-chakra',
    display: 'swap',
});

// Body: humanist, highly legible
const plexSans = IBM_Plex_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-plex-sans',
    display: 'swap',
});

// Mono: instrument readouts, labels, data
const plexMono = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-plex-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: {
        default: 'CircuitForge - Collaborative Circuit Design for Education',
        template: '%s | CircuitForge',
    },
    description:
        'Build, simulate, and learn electronic circuits together in real-time. Perfect for teachers and students exploring digital logic, robotics, and automation.',
    keywords: [
        'circuit design',
        'electronics',
        'education',
        'collaboration',
        'logic gates',
        'simulation',
    ],
    authors: [{ name: 'CircuitForge' }],
    icons: {
        icon: '/icon.svg',
        shortcut: '/icon.svg',
        apple: '/icon.svg',
    },
    openGraph: {
        title: 'CircuitForge - Collaborative Circuit Design',
        description: 'Build, simulate, and learn electronic circuits together in real-time.',
        type: 'website',
        siteName: 'CircuitForge',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'CircuitForge - Collaborative Circuit Design',
        description: 'Build, simulate, and learn electronic circuits together in real-time.',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/icon.svg" type="image/svg+xml" />
                <link rel="apple-touch-icon" href="/icon.svg" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var html = document.documentElement;
                  html.classList.remove('light', 'dark');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    html.classList.add('dark');
                  } else {
                    html.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
                    }}
                />
            </head>
            <body
                className={`${plexSans.variable} ${chakra.variable} ${plexMono.variable} bg-background font-sans text-foreground antialiased`}
            >
                <AxiomProvider>
                    <ThemeProvider>
                        {children}
                        <FloatingLLMButton />
                    </ThemeProvider>
                </AxiomProvider>
            </body>
        </html>
    );
}
