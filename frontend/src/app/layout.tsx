import { Inter, Outfit, JetBrains_Mono } from 'next/font/google'; // Using JetBrains Mono for a better code aesthetic

import type { Metadata } from 'next';

import './globals.css';
import { ThemeProvider } from '@/components/ui';
import { FloatingLLMButton } from '@/components/ui/FloatingLLMButton';
import { AxiomProvider } from '@/components/providers/AxiomProvider';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-outfit',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains-mono',
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
                className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} bg-background font-sans text-foreground antialiased`}
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
