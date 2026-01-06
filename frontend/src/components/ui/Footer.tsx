'use client';

import Link from 'next/link';
import { Button, Input, IconButton } from '@/components/ui';
import { Twitter, Github, Linkedin, Disc, Zap } from 'lucide-react';

export function Footer() {
    return (
        <footer className="relative bg-[#050510] border-t border-white/5 overflow-hidden">
            {/* Background Grid Pattern - subtle texture */}
            <div className="absolute inset-0 z-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 pt-20 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
                    {/* Brand Column */}
                    <div className="md:col-span-3 space-y-6">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-200">
                                <Zap className="w-6 h-6 fill-current" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                                Circuit Forge
                            </span>
                        </Link>
                        <p className="text-text-muted text-sm leading-relaxed max-w-xs">
                            The professional platform for designing, simulating, and testing digital logic circuits in the browser.
                            Built for students, educators, and engineers.
                        </p>
                        <div className="flex gap-2">
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white transition-colors">
                                <IconButton icon={<Github className="w-5 h-5" />} aria-label="Github" variant="ghost" size="sm" />
                            </a>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white transition-colors">
                                <IconButton icon={<Twitter className="w-5 h-5" />} aria-label="Twitter" variant="ghost" size="sm" />
                            </a>
                            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white transition-colors">
                                <IconButton icon={<Linkedin className="w-5 h-5" />} aria-label="LinkedIn" variant="ghost" size="sm" />
                            </a>
                            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white transition-colors">
                                <IconButton icon={<Disc className="w-5 h-5" />} aria-label="Discord" variant="ghost" size="sm" />
                            </a>
                        </div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="md:col-span-2 space-y-4">
                        <h4 className="font-semibold text-foreground">Product</h4>
                        <ul className="space-y-2 text-sm text-text-muted">
                            <li><Link href="/playground" className="hover:text-primary transition-colors">Playground</Link></li>
                            <li><Link href="/courses" className="hover:text-primary transition-colors">AI Course Gen</Link></li>
                            <li><Link href="/templates" className="hover:text-primary transition-colors">Templates</Link></li>
                            <li><Link href="/changelog" className="hover:text-primary transition-colors">Changelog</Link></li>
                        </ul>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <h4 className="font-semibold text-foreground">Resources</h4>
                        <ul className="space-y-2 text-sm text-text-muted">
                            <li><Link href="/docs" className="hover:text-primary transition-colors">Documentation</Link></li>
                            <li><Link href="/api" className="hover:text-primary transition-colors">API Reference</Link></li>
                            <li><Link href="/community" className="hover:text-primary transition-colors">Community</Link></li>
                            <li><Link href="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <h4 className="font-semibold text-foreground">Company</h4>
                        <ul className="space-y-2 text-sm text-text-muted">
                            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link href="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
                            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                            <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter Column */}
                    <div className="md:col-span-3 space-y-4">
                        <h4 className="font-semibold text-foreground">Stay Updated</h4>
                        <p className="text-sm text-text-muted">
                            Get the latest updates on features and releases.
                        </p>
                        <div className="flex flex-col gap-2">
                            <Input placeholder="Enter your email" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                            <Button className="w-full">Subscribe</Button>
                        </div>
                    </div>
                </div>

                {/* Big Text Overlay */}
                <div className="relative w-full overflow-hidden h-32 md:h-48 flex items-end justify-center pointer-events-none select-none">
                    <h1 className="text-[15vw] leading-[0.8] tracking-tighter font-bold text-transparent"
                        style={{
                            WebkitTextStroke: '1px rgba(255, 255, 255, 0.15)',
                        }}
                    >
                        CircuitForge
                    </h1>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-text-muted">
                    <p>© 2025 Circuit Forge Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
