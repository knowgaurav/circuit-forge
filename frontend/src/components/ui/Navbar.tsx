'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Zap, Menu, X } from 'lucide-react';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';
import { Spinner } from './Spinner';
import { Modal } from './Modal';
import { Input } from './Input';
import { api } from '@/services/api';
import clsx from 'clsx';

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
      <nav className={clsx(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled
          ? "glass border-border/50 py-2"
          : "bg-transparent border-transparent py-4"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-brand shadow-lg group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">CircuitForge</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    pathname === link.href
                      ? "text-primary bg-primary/10"
                      : "text-muted hover:text-foreground hover:bg-surface-secondary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {showSessionButtons && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setShowJoinModal(true)}>
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
              className="md:hidden p-2 rounded-md text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-border/50 animate-fade-in">
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "block px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-surface-secondary"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-4 mt-2 border-t border-border/50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted">Theme</span>
                  <ThemeToggle />
                </div>
                {showSessionButtons && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={() => { setShowJoinModal(true); setMobileMenuOpen(false); }}>
                      Join
                    </Button>
                    <Button
                      onClick={() => { handleCreateSession(); setMobileMenuOpen(false); }}
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

      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join a Session">
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
            <Button type="button" variant="secondary" onClick={() => setShowJoinModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isJoining || !joinCode.trim()} variant="primary" className="flex-1">
              {isJoining ? <Spinner size="sm" /> : 'Join Session'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
