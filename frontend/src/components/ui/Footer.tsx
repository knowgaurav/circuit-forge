'use client';

import Link from 'next/link';

import { Github, Twitter, Zap } from 'lucide-react';

import { IconButton } from '@/components/ui';

export function Footer() {
    return (
        <footer className="border-t border-border bg-surface">
            <div className="mx-auto max-w-7xl px-4 py-12">
                <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                    {/* Brand */}
                    <Link href="/" className="group flex items-center gap-2.5">
                        <div className="border-primary/40 bg-primary/10 flex h-10 w-10 items-center justify-center rounded-md border text-primary">
                            <Zap className="h-6 w-6 fill-current" />
                        </div>
                        <span className="font-heading text-xl font-bold tracking-tight text-foreground">
                            Circuit<span className="text-primary">Forge</span>
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
                        <Link href="/playground" className="transition-colors hover:text-primary">
                            Playground
                        </Link>
                        <Link href="/courses" className="transition-colors hover:text-primary">
                            Courses
                        </Link>
                        <Link href="/templates" className="transition-colors hover:text-primary">
                            Templates
                        </Link>
                    </nav>

                    {/* Social */}
                    <div className="flex gap-2">
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-muted transition-colors hover:text-primary"
                        >
                            <IconButton
                                icon={<Github className="h-5 w-5" />}
                                aria-label="Github"
                                variant="ghost"
                                size="sm"
                            />
                        </a>
                        <a
                            href="https://twitter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-muted transition-colors hover:text-primary"
                        >
                            <IconButton
                                icon={<Twitter className="h-5 w-5" />}
                                aria-label="Twitter"
                                variant="ghost"
                                size="sm"
                            />
                        </a>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 border-t border-border pt-6 font-mono text-xs text-text-muted">
                    <p>© 2025 CircuitForge. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
