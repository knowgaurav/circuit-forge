'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import clsx from 'clsx';
import { Zap, Menu, X } from 'lucide-react';

import { api } from '@/services/api';

import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
    showSessionButtons?: boolean;
}

export function Navbar({ showSessionButtons = true }: NavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [scrolled, setScrolled] = useState(false);

    // Add scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleCreateSession = async () => {
        setIsCreating(true);
        try {
            const session = await api.createSession();
            router.push(`/session/${session.code}`);
        } catch (error) {
            console.error('Failed to create session:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setIsJoining(true);
        router.push(`/session/${joinCode.trim().toUpperCase()}`);
    };

    const navLinks = [
        { href: '/#features', label: 'Features' },
        { href: '/#topics', label: 'Topics' },
        { href: '/templates', label: 'Templates' },
        { href: '/courses/create', label: 'AI Courses' },
        { href: '/playground', label: 'Playground' },
    ];

    return (
        <>
            <nav
                className={clsx(
                    'fixed left-0 right-0 top-0 z-50 border-b transition-all duration-300',
                    scrolled ? 'glass border-border py-2' : 'border-transparent bg-transparent py-4'
                )}
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-12 items-center justify-between">
                        <Link href="/" className="group flex items-center gap-2.5">
                            <div className="border-primary/40 bg-primary/10 relative flex h-9 w-9 items-center justify-center rounded-md border transition-all group-hover:border-primary group-hover:shadow-glow">
                                <Zap className="h-5 w-5 fill-primary text-primary" />
                                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
                            </div>
                            <span className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                                Circuit<span className="text-primary">Forge</span>
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden items-center gap-1 md:flex">
                            {navLinks.map((link) => {
                                const active = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={clsx(
                                            'relative rounded-md px-3.5 py-2 font-mono text-xs font-medium uppercase tracking-wider transition-all duration-200',
                                            active
                                                ? 'text-primary'
                                                : 'text-text-muted hover:bg-surface-secondary hover:text-foreground'
                                        )}
                                    >
                                        {link.label}
                                        {active && (
                                            <span className="absolute inset-x-3.5 -bottom-px h-px bg-primary shadow-glow" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="hidden items-center gap-3 md:flex">
                            <ThemeToggle />
                            {showSessionButtons && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowJoinModal(true)}
                                    >
                                        Join Session
                                    </Button>
                                    <Button
                                        onClick={handleCreateSession}
                                        disabled={isCreating}
                                        variant="glow"
                                        size="sm"
                                        className="flex items-center gap-2"
                                    >
                                        {isCreating ? <Spinner size="sm" /> : 'Create Session'}
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <button
                            className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-secondary hover:text-foreground md:hidden"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="glass animate-fade-in border-t border-border md:hidden">
                        <div className="space-y-2 px-4 py-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={clsx(
                                        'block rounded-lg px-4 py-3 font-mono text-xs font-medium uppercase tracking-wider transition-colors',
                                        pathname === link.href
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-text-muted hover:bg-surface-secondary hover:text-foreground'
                                    )}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-text-muted">
                                        Theme
                                    </span>
                                    <ThemeToggle />
                                </div>
                                {showSessionButtons && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                setShowJoinModal(true);
                                                setMobileMenuOpen(false);
                                            }}
                                        >
                                            Join
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                handleCreateSession();
                                                setMobileMenuOpen(false);
                                            }}
                                            disabled={isCreating}
                                            variant="primary"
                                        >
                                            {isCreating ? <Spinner size="sm" /> : 'Create'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            <Modal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                title="Join a Session"
            >
                <form onSubmit={handleJoinSession} className="space-y-4">
                    <Input
                        label="Session Code"
                        placeholder="Enter 6-character code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        disabled={isJoining}
                    />
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowJoinModal(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isJoining || !joinCode.trim()}
                            variant="primary"
                            className="flex-1"
                        >
                            {isJoining ? <Spinner size="sm" /> : 'Join Session'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
