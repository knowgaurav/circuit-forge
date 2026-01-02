'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Menu, X } from 'lucide-react';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';
import { Spinner } from './Spinner';
import { Modal } from './Modal';
import { Input } from './Input';
import { api } from '@/services/api';

interface NavbarProps {
  showSessionButtons?: boolean;
}

export function Navbar({ showSessionButtons = true }: NavbarProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');

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

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-hero-bg rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-text">CircuitForge</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/#features" className="text-text-secondary hover:text-text text-sm font-medium transition-colors">
                Features
              </Link>
              <Link href="/#topics" className="text-text-secondary hover:text-text text-sm font-medium transition-colors">
                Topics
              </Link>
              <Link href="/templates" className="text-text-secondary hover:text-text text-sm font-medium transition-colors">
                Templates
              </Link>
              <Link href="/courses/create" className="text-text-secondary hover:text-text text-sm font-medium transition-colors">
                AI Courses
              </Link>
              <Link href="/playground" className="text-text-secondary hover:text-text text-sm font-medium transition-colors">
                Playground
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {showSessionButtons && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setShowJoinModal(true)} className="text-text-secondary hover:text-text">
                    Join Session
                  </Button>
                  <button
                    onClick={handleCreateSession}
                    disabled={isCreating}
                    className="gradient-btn px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2"
                  >
                    {isCreating ? <Spinner size="sm" /> : 'Create Session'}
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-text-secondary hover:text-text"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-border/50">
            <div className="px-4 py-4 space-y-3">
              <Link href="/#features" className="block text-text-secondary hover:text-text text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Features
              </Link>
              <Link href="/#topics" className="block text-text-secondary hover:text-text text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Topics
              </Link>
              <Link href="/templates" className="block text-text-secondary hover:text-text text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Templates
              </Link>
              <Link href="/courses/create" className="block text-text-secondary hover:text-text text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                AI Courses
              </Link>
              <Link href="/playground" className="block text-text-secondary hover:text-text text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Playground
              </Link>
              <div className="pt-3 border-t border-border/50 flex items-center gap-3">
                <ThemeToggle />
                {showSessionButtons && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => { setShowJoinModal(true); setMobileMenuOpen(false); }} className="text-text-secondary">
                      Join
                    </Button>
                    <button
                      onClick={() => { handleCreateSession(); setMobileMenuOpen(false); }}
                      disabled={isCreating}
                      className="gradient-btn px-3 py-1.5 rounded-lg text-white text-sm font-medium"
                    >
                      {isCreating ? <Spinner size="sm" /> : 'Create'}
                    </button>
                  </>
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
            <Button type="submit" disabled={isJoining || !joinCode.trim()} className="flex-1">
              {isJoining ? <Spinner size="sm" /> : 'Join Session'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
