'use client';

import Link from 'next/link';

import { Twitter, Github, Linkedin, Disc, Zap } from 'lucide-react';

import { Button, Input, IconButton } from '@/components/ui';

export function Footer() {
    return (
        <footer className="relative overflow-hidden border-t border-border bg-surface">
            {/* Blueprint grid texture */}
            <div className="bg-grid pointer-events-none absolute inset-0 z-0 opacity-60" />
            {/* Top signal rail */}
            <div className="via-primary/60 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-20">
                <div className="mb-20 grid grid-cols-1 gap-12 md:grid-cols-12">
                    {/* Brand Column */}
                    <div className="space-y-6 md:col-span-3">
                        <Link href="/" className="group flex items-center gap-2.5">
                            <div className="border-primary/40 bg-primary/10 relative flex h-10 w-10 items-center justify-center rounded-md border text-primary transition-all duration-200 group-hover:shadow-glow">
                                <Zap className="h-6 w-6 fill-current" />
                            </div>
                            <span className="font-heading text-xl font-bold tracking-tight text-foreground">
                                Circuit<span className="text-primary">Forge</span>
                            </span>
                        </Link>
                        <p className="max-w-xs text-sm leading-relaxed text-text-muted">
                            The professional platform for designing, simulating, and testing digital
                            logic circuits in the browser. Built for students, educators, and
                            engineers.
                        </p>
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
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-text-muted transition-colors hover:text-primary"
                            >
                                <IconButton
                                    icon={<Linkedin className="h-5 w-5" />}
                                    aria-label="LinkedIn"
                                    variant="ghost"
                                    size="sm"
                                />
                            </a>
                            <a
                                href="https://discord.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-text-muted transition-colors hover:text-primary"
                            >
                                <IconButton
                                    icon={<Disc className="h-5 w-5" />}
                                    aria-label="Discord"
                                    variant="ghost"
                                    size="sm"
                                />
                            </a>
                        </div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="space-y-4 md:col-span-2">
                        <h4 className="font-semibold text-foreground">Product</h4>
                        <ul className="space-y-2 text-sm text-text-muted">
                            <li>
                                <Link
                                    href="/playground"
                                    className="transition-colors hover:text-primary"
                                >
                                    Playground
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/courses"
                                    className="transition-colors hover:text-primary"
                                >
                                    AI Course Gen
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/templates"
                                    className="transition-colors hover:text-primary"
                                >
                                    Templates
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/changelog"
                                    className="transition-colors hover:text-primary"
                                >
                                    Changelog
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4 md:col-span-2">
                        <h4 className="font-semibold text-foreground">Resources</h4>
                        <ul className="space-y-2 text-sm text-text-muted">
                            <li>
                                <Link href="/docs" className="transition-colors hover:text-primary">
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link href="/api" className="transition-colors hover:text-primary">
                                    API Reference
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/community"
                                    className="transition-colors hover:text-primary"
                                >
                                    Community
                                </Link>
                            </li>
                            <li>
                                <Link href="/blog" className="transition-colors hover:text-primary">
                                    Blog
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4 md:col-span-2">
                        <h4 className="font-semibold text-foreground">Company</h4>
                        <ul className="space-y-2 text-sm text-text-muted">
                            <li>
                                <Link
                                    href="/about"
                                    className="transition-colors hover:text-primary"
                                >
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/careers"
                                    className="transition-colors hover:text-primary"
                                >
                                    Careers
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/contact"
                                    className="transition-colors hover:text-primary"
                                >
                                    Contact
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/privacy"
                                    className="transition-colors hover:text-primary"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter Column */}
                    <div className="space-y-4 md:col-span-3">
                        <h4 className="font-semibold text-foreground">Stay Updated</h4>
                        <p className="text-sm text-text-muted">
                            Get the latest updates on features and releases.
                        </p>
                        <div className="flex flex-col gap-2">
                            <Input placeholder="Enter your email" />
                            <Button className="w-full">Subscribe</Button>
                        </div>
                    </div>
                </div>

                {/* Big Text Overlay */}
                <div className="pointer-events-none relative flex h-32 w-full select-none items-end justify-center overflow-hidden md:h-48">
                    <h1
                        className="font-heading text-[15vw] font-bold leading-[0.8] tracking-tighter text-transparent"
                        style={{
                            WebkitTextStroke: '1px var(--border-strong)',
                        }}
                    >
                        CircuitForge
                    </h1>
                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 font-mono text-xs text-text-muted md:flex-row">
                    <p>© 2025 CircuitForge. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/terms" className="transition-colors hover:text-primary">
                            Terms of Service
                        </Link>
                        <Link href="/privacy" className="transition-colors hover:text-primary">
                            Privacy Policy
                        </Link>
                        <Link href="/cookies" className="transition-colors hover:text-primary">
                            Cookie Policy
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
