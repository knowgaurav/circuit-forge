'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { ArrowRight, LogIn, Users } from 'lucide-react';

import { Button, FadeIn, GradientText, Input, Navbar, Spinner } from '@/components/ui';

import { useSessionRecovery } from '@/hooks';
import { api } from '@/services/api';

export default function SessionLobbyPage() {
    const router = useRouter();

    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [createError, setCreateError] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const { pendingSession, clearPendingSession } = useSessionRecovery();

    const handleJoinSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setJoinError('');

        // Accept a raw 6-character code or a pasted session link.
        let code = joinCode.trim().toUpperCase();
        const urlMatch = code.match(/SESSION\/([A-Z0-9]{6})/i);
        if (urlMatch?.[1]) code = urlMatch[1].toUpperCase();

        if (!/^[A-Z0-9]{6}$/.test(code)) {
            setJoinError('Enter a valid 6-character session code');
            return;
        }

        setIsJoining(true);
        try {
            const session = await api.getSession(code);
            if (!session.exists) {
                setJoinError('Session not found or expired');
                return;
            }
            router.push(`/session/${code}`);
        } catch (err) {
            setJoinError(err instanceof Error ? err.message : 'Failed to join session');
        } finally {
            setIsJoining(false);
        }
    };

    const handleCreateSession = async () => {
        setCreateError('');
        setIsCreating(true);
        try {
            const { code, participantId } = await api.createSession();
            // Persisting the creator's participant ID makes them the teacher on join.
            localStorage.setItem(`participant_${code}`, participantId);
            router.push(`/session/${code}`);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create session');
            setIsCreating(false);
        }
    };

    const handleRejoinSession = () => {
        if (pendingSession) {
            router.push(`/session/${pendingSession.sessionCode}`);
        }
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-background transition-colors duration-300">
            <Navbar showSessionButtons={false} />

            <section className="relative overflow-hidden px-4 pb-24 pt-32">
                {/* Blueprint grid backdrop */}
                <div className="bg-grid pointer-events-none absolute inset-0" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_30%,var(--background)_85%)]" />
                <div className="bg-primary/10 pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full blur-3xl" />

                <div className="relative mx-auto max-w-5xl">
                    <FadeIn direction="up" className="mb-12 text-center">
                        <p className="eyebrow mb-3">&#47;&#47; Collaborate</p>
                        <h1 className="mb-4 font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                            Jump into a <GradientText>session</GradientText>
                        </h1>
                        <p className="mx-auto max-w-xl text-lg text-text-secondary">
                            Join an existing session with a code, or start a new one as the teacher
                            and invite your students.
                        </p>
                    </FadeIn>

                    {/* Rejoin banner */}
                    {pendingSession && (
                        <FadeIn direction="up" className="mx-auto mb-8 max-w-2xl">
                            <div className="border-primary/30 flex items-center justify-between gap-4 rounded-xl border bg-surface p-4 shadow-glow">
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        Rejoin session{' '}
                                        <span className="font-mono text-primary">
                                            {pendingSession.sessionCode}
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-text-muted">
                                        as {pendingSession.displayName}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={clearPendingSession}>
                                        Dismiss
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleRejoinSession}
                                    >
                                        Rejoin
                                    </Button>
                                </div>
                            </div>
                        </FadeIn>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Join an existing session */}
                        <FadeIn direction="right" delay={0.1}>
                            <div className="hover:border-primary/40 flex h-full flex-col rounded-2xl border border-border bg-surface p-8 shadow-glass transition-colors">
                                <div className="border-primary/30 bg-primary/10 mb-5 flex h-12 w-12 items-center justify-center rounded-lg border text-primary">
                                    <LogIn className="h-6 w-6" />
                                </div>
                                <h2 className="mb-2 font-heading text-xl font-semibold text-foreground">
                                    Join a session
                                </h2>
                                <p className="mb-6 text-sm text-text-muted">
                                    Got a code from your teacher? Enter it below to hop into the
                                    shared board.
                                </p>
                                <form
                                    onSubmit={handleJoinSession}
                                    className="mt-auto flex flex-col gap-4"
                                >
                                    <Input
                                        label="Session code"
                                        placeholder="Enter 6-character code or link"
                                        value={joinCode}
                                        onChange={(e) => {
                                            setJoinCode(e.target.value.toUpperCase());
                                            if (joinError) setJoinError('');
                                        }}
                                        error={joinError}
                                        disabled={isJoining}
                                        className="font-mono uppercase tracking-widest"
                                    />
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        disabled={isJoining || !joinCode.trim()}
                                        className="w-full"
                                    >
                                        {isJoining ? (
                                            <Spinner size="sm" className="mr-2" />
                                        ) : (
                                            <ArrowRight className="mr-2 h-5 w-5" />
                                        )}
                                        Join Session
                                    </Button>
                                </form>
                            </div>
                        </FadeIn>

                        {/* Start a new session */}
                        <FadeIn direction="left" delay={0.2}>
                            <div className="border-primary/30 flex h-full flex-col rounded-2xl border bg-surface p-8 shadow-glass">
                                <div className="border-primary/40 bg-primary/15 mb-5 flex h-12 w-12 items-center justify-center rounded-lg border text-primary">
                                    <Users className="h-6 w-6" />
                                </div>
                                <h2 className="mb-2 font-heading text-xl font-semibold text-foreground">
                                    Start a new session
                                </h2>
                                <p className="mb-6 text-sm text-text-muted">
                                    Create a fresh board as the teacher. You can edit, run
                                    simulations, and manage who joins.
                                </p>
                                <div className="mt-auto flex flex-col gap-4">
                                    {createError && (
                                        <p className="text-sm text-error">{createError}</p>
                                    )}
                                    <Button
                                        onClick={handleCreateSession}
                                        variant="glow"
                                        size="lg"
                                        disabled={isCreating}
                                        className="w-full"
                                    >
                                        {isCreating ? (
                                            <Spinner size="sm" className="mr-2" />
                                        ) : (
                                            <Users className="mr-2 h-5 w-5" />
                                        )}
                                        Create as Teacher
                                    </Button>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>
        </div>
    );
}
