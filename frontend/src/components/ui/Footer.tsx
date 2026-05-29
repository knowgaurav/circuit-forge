'use client';

import Link from 'next/link';

import { Twitter, Github, Linkedin, Disc, Zap } from 'lucide-react';

import { Button, Input, IconButton } from '@/components/ui';

export function Footer() {
    return (
        <footer className="relative overflow-hidden border-t border-white/5 bg-[#050510]">
            {/* Background Grid Pattern - subtle texture */}
            <div
                className="absolute inset-0 z-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-20">
                <div className="mb-20 grid grid-cols-1 gap-12 md:grid-cols-12">
                    {/* Brand Column */}
                    <div className="space-y-6 md:col-span-3">
                        <Link href="/" className="group flex items-center gap-2">
                            <div className="shadow-primary/25 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg transition-transform duration-200 group-hover:scale-110">
                                <Zap className="h-6 w-6 fill-current" />
                            </div>
                            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-xl font-bold text-transparent">
                                Circuit Forge
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
                                className="text-text-muted transition-colors hover:text-white"
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
                                className="text-text-muted transition-colors hover:text-white"
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
                                className="text-text-muted transition-colors hover:text-white"
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
                                className="text-text-muted transition-colors hover:text-white"
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
                            <Input
                                placeholder="Enter your email"
                                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                            />
                            <Button className="w-full">Subscribe</Button>
                        </div>
                    </div>
                </div>

                {/* Big Text Overlay */}
                <div className="pointer-events-none relative flex h-32 w-full select-none items-end justify-center overflow-hidden md:h-48">
                    <h1
                        className="text-[15vw] font-bold leading-[0.8] tracking-tighter text-transparent"
                        style={{
                            WebkitTextStroke: '1px rgba(255, 255, 255, 0.15)',
                        }}
                    >
                        CircuitForge
                    </h1>
                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-text-muted md:flex-row">
                    <p>© 2025 Circuit Forge Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/terms" className="transition-colors hover:text-white">
                            Terms of Service
                        </Link>
                        <Link href="/privacy" className="transition-colors hover:text-white">
                            Privacy Policy
                        </Link>
                        <Link href="/cookies" className="transition-colors hover:text-white">
                            Cookie Policy
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
