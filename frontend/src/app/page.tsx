'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Zap,
    Users,
    BookOpen,
    Sparkles,
    Play,
    Share2,
    Cpu,
    ArrowRight,
    Monitor,
    Check,
    Grid,
    Battery,
    Calculator,
    CircuitBoard,
    Gauge,
    ToggleLeft,
    Layers,
    Radio,
    Timer,
} from 'lucide-react';
import {
    Button,
    Input,
    Spinner,
    Modal,
    GradientText,
    AnimatedCounter,
    CategoryCard,
    TemplateCard,
    Navbar,
    Footer,
    FadeIn,
    StaggerContainer,
    fadeInItemVariants,
} from '@/components/ui';
import { useSessionRecovery } from '@/hooks';
import { api } from '@/services/api';

// Stats data
const stats = [
    { value: 60, suffix: '+', label: 'Components', icon: <Cpu className="h-5 w-5" /> },
    { value: 30, suffix: '+', label: 'Templates', icon: <BookOpen className="h-5 w-5" /> },
    { value: 11, suffix: '', label: 'Categories', icon: <Grid className="h-5 w-5" /> },
    { value: 100, suffix: '%', label: 'Free', icon: <Sparkles className="h-5 w-5" /> },
];

// Categories data
const categories = [
    {
        id: 'logic-gates',
        name: 'Logic Gates',
        icon: <CircuitBoard className="h-6 w-6" />,
        count: 12,
        description: 'AND, OR, NOT, XOR and more',
    },
    {
        id: 'flip-flops',
        name: 'Flip-Flops',
        icon: <ToggleLeft className="h-6 w-6" />,
        count: 8,
        description: 'SR, JK, D, T flip-flops',
    },
    {
        id: 'sensors',
        name: 'Sensors',
        icon: <Gauge className="h-6 w-6" />,
        count: 10,
        description: 'Light, temperature, motion',
    },
    {
        id: 'motors',
        name: 'Motors & Actuators',
        icon: <Radio className="h-6 w-6" />,
        count: 6,
        description: 'DC, servo, stepper motors',
    },
    {
        id: 'displays',
        name: 'Displays',
        icon: <Monitor className="h-6 w-6" />,
        count: 5,
        description: '7-segment, LCD, LED matrix',
    },
    {
        id: 'power',
        name: 'Power Sources',
        icon: <Battery className="h-6 w-6" />,
        count: 4,
        description: 'Batteries, supplies, regulators',
    },
    {
        id: 'arithmetic',
        name: 'Arithmetic',
        icon: <Calculator className="h-6 w-6" />,
        count: 8,
        description: 'Adders, multipliers, ALUs',
    },
    {
        id: 'memory',
        name: 'Memory',
        icon: <Layers className="h-6 w-6" />,
        count: 6,
        description: 'Registers, RAM, ROM',
    },
];

// Featured templates data
const featuredTemplates = [
    {
        id: 'half-adder',
        name: 'Half Adder',
        difficulty: 'beginner' as const,
        category: 'Arithmetic',
        description: 'Learn basic binary addition with XOR and AND gates',
    },
    {
        id: 'sr-latch',
        name: 'SR Latch',
        difficulty: 'beginner' as const,
        category: 'Memory',
        description: 'Build a simple set-reset memory element',
    },
    {
        id: '4bit-counter',
        name: '4-Bit Counter',
        difficulty: 'intermediate' as const,
        category: 'Sequential',
        description: 'Create a binary counter using flip-flops',
    },
    {
        id: 'alu',
        name: 'Simple ALU',
        difficulty: 'advanced' as const,
        category: 'Arithmetic',
        description: 'Build an arithmetic logic unit from scratch',
    },
    {
        id: 'traffic-light',
        name: 'Traffic Light Controller',
        difficulty: 'intermediate' as const,
        category: 'Automation',
        description: 'Design a state machine for traffic signals',
    },
    {
        id: 'decoder',
        name: '3-to-8 Decoder',
        difficulty: 'beginner' as const,
        category: 'Logic',
        description: 'Implement a binary decoder circuit',
    },
];

// Features data
const features = [
    {
        icon: <Users className="h-5 w-5" />,
        title: 'Real-time Collaboration',
        description: 'Work together with live cursor tracking',
    },
    {
        icon: <Play className="h-5 w-5" />,
        title: 'Live Simulation',
        description: 'Run and visualize signal flow instantly',
    },
    {
        icon: <BookOpen className="h-5 w-5" />,
        title: 'Guided Templates',
        description: 'Learn from 30+ step-by-step tutorials',
    },
    {
        icon: <Share2 className="h-5 w-5" />,
        title: 'Easy Sharing',
        description: 'Share with a simple 6-character code',
    },
    {
        icon: <Monitor className="h-5 w-5" />,
        title: 'Export & Import',
        description: 'Save as PNG or JSON files',
    },
    {
        icon: <Timer className="h-5 w-5" />,
        title: 'No Setup Required',
        description: 'Start building in seconds',
    },
];

export default function HomePage() {
    const router = useRouter();
    const [joinCode, setJoinCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(false);

    // Session recovery
    const { pendingSession, clearPendingSession } = useSessionRecovery();

    const handleRejoinSession = () => {
        if (pendingSession) {
            router.push(`/session/${pendingSession.sessionCode}`);
        }
    };

    const handleDismissRejoin = () => {
        clearPendingSession();
    };

    const handleCreateSession = async () => {
        setIsCreating(true);
        setError('');
        try {
            const { code, participantId } = await api.createSession();
            localStorage.setItem(`participant_${code}`, participantId);
            router.push(`/session/${code}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create session');
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) {
            setError('Please enter a session code');
            return;
        }
        setIsJoining(true);
        setError('');
        try {
            let code = joinCode.trim().toUpperCase();
            const urlMatch = code.match(/session\/([A-Z0-9]{6})/i);
            if (urlMatch?.[1]) code = urlMatch[1].toUpperCase();
            const session = await api.getSession(code);
            if (!session.exists) {
                setError('Session not found or expired');
                return;
            }
            router.push(`/session/${code}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to join session');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="selection:bg-primary/20 min-h-screen overflow-x-hidden bg-background transition-colors duration-300 selection:text-primary">
            <Navbar showSessionButtons={false} />

            {/* Rejoin Session Banner */}
            {pendingSession && (
                <FadeIn
                    direction="down"
                    className="fixed left-1/2 top-24 z-40 w-full max-w-md -translate-x-1/2 px-4"
                >
                    <div className="glass-card border-primary/20 bg-surface/80 rounded-xl border p-4 shadow-lg backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">
                                    Rejoin session {pendingSession.sessionCode}?
                                </p>
                                <p className="mt-0.5 text-xs text-text-muted">
                                    as {pendingSession.displayName}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={handleDismissRejoin}>
                                    Dismiss
                                </Button>
                                <Button onClick={handleRejoinSession} size="sm" variant="primary">
                                    Rejoin
                                </Button>
                            </div>
                        </div>
                    </div>
                </FadeIn>
            )}

            {/* Hero Section */}
            <section className="relative overflow-hidden px-4 pb-20 pt-32">
                {/* Background gradient */}
                <div className="from-primary/20 absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] via-background to-background" />
                <div className="bg-primary/5 absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow rounded-full blur-3xl" />

                <div className="relative mx-auto max-w-7xl">
                    <div className="grid items-center gap-12 lg:grid-cols-2">
                        {/* Left content */}
                        <FadeIn direction="right" delay={0.1}>
                            <div className="glass border-primary/20 bg-primary/5 mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-primary">
                                <Sparkles className="h-4 w-4" />
                                Free for Education
                            </div>
                            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-7xl">
                                Master <GradientText>Circuit Design</GradientText> with Interactive
                                Learning
                            </h1>
                            <p className="mb-8 max-w-xl text-lg leading-relaxed text-text-secondary">
                                Build, simulate, and learn electronic circuits together in
                                real-time. Perfect for teachers and students exploring digital
                                logic, robotics, and automation.
                            </p>
                            <div className="flex flex-col gap-4 sm:flex-row">
                                <Button
                                    onClick={handleCreateSession}
                                    disabled={isCreating}
                                    size="lg"
                                    variant="glow"
                                    className="px-8 text-lg"
                                >
                                    {isCreating ? (
                                        <Spinner size="sm" />
                                    ) : (
                                        <Users className="mr-2 h-5 w-5" />
                                    )}
                                    Start Building
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                <Link href="/templates">
                                    <Button
                                        size="lg"
                                        variant="secondary"
                                        className="w-full px-8 text-lg sm:w-auto"
                                    >
                                        <BookOpen className="mr-2 h-5 w-5" />
                                        Browse Templates
                                    </Button>
                                </Link>
                            </div>
                        </FadeIn>

                        {/* Right content - Hero illustration */}
                        <FadeIn direction="left" delay={0.3} className="hidden lg:block">
                            <div className="group relative">
                                <div className="border-border/50 bg-surface/50 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-sm transition-transform duration-500 group-hover:scale-[1.02]">
                                    <img
                                        src="/hero-illustration.png"
                                        alt="Student building electronic circuits with logic gates"
                                        className="h-auto w-full rounded-2xl"
                                    />
                                </div>
                                {/* Decorative elements */}
                                <div className="bg-primary/20 absolute -right-10 -top-10 -z-10 h-40 w-40 rounded-full blur-3xl" />
                                <div className="bg-accent/20 absolute -bottom-10 -left-10 -z-10 h-40 w-40 rounded-full blur-3xl" />
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="border-border/50 bg-surface-secondary/50 border-y px-4 py-12">
                <div className="mx-auto max-w-5xl">
                    <FadeIn direction="up" delay={0.2}>
                        <div className="glass-card rounded-2xl p-8">
                            <StaggerContainer className="grid grid-cols-2 gap-8 md:grid-cols-4">
                                {stats.map((stat) => (
                                    <motion.div
                                        key={stat.label}
                                        variants={fadeInItemVariants}
                                        className="text-center"
                                    >
                                        <AnimatedCounter
                                            end={stat.value}
                                            suffix={stat.suffix}
                                            label={stat.label}
                                            icon={stat.icon}
                                        />
                                    </motion.div>
                                ))}
                            </StaggerContainer>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative bg-background px-4 py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="grid items-center gap-16 lg:grid-cols-2">
                        {/* Left - Feature list */}
                        <FadeIn direction="right">
                            <h2 className="mb-6 text-3xl font-bold text-foreground md:text-5xl">
                                Your Personal <GradientText>Learning Assistant</GradientText>
                            </h2>
                            <p className="mb-10 text-lg text-text-secondary">
                                Everything you need to master circuit design, from basic logic gates
                                to complex systems.
                            </p>
                            <StaggerContainer className="grid gap-5 sm:grid-cols-2">
                                {features.map((feature) => (
                                    <motion.div
                                        key={feature.title}
                                        variants={fadeInItemVariants}
                                        className="glass-card hover:bg-surface/60 flex items-start gap-4 rounded-xl p-5 transition-colors"
                                    >
                                        <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-primary">
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <h3 className="mb-1 text-sm font-semibold text-foreground">
                                                {feature.title}
                                            </h3>
                                            <p className="text-xs leading-relaxed text-text-muted">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </StaggerContainer>
                        </FadeIn>

                        {/* Right - Editor preview */}
                        <FadeIn direction="left" delay={0.2}>
                            <div className="glass-card shadow-glass-lg border-primary/10 bg-surface/30 rounded-2xl p-2">
                                <img
                                    src="/editor-preview.png"
                                    alt="CircuitForge editor interface showing a half-adder circuit"
                                    className="h-auto w-full rounded-xl shadow-inner"
                                />
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* Interactive Practice Section */}
            <section className="bg-surface-secondary/30 border-border/50 border-y px-4 py-24">
                <div className="mx-auto max-w-4xl">
                    <FadeIn direction="up">
                        <div className="glass border-primary/20 relative overflow-hidden rounded-3xl border p-8 md:p-12">
                            <div className="from-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent" />

                            <div className="relative z-10 mb-10 text-center">
                                <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                                    Master Circuits with{' '}
                                    <GradientText>Interactive Practice</GradientText>
                                </h2>
                                <p className="mx-auto max-w-2xl text-lg text-text-secondary">
                                    Learn by doing. Build real circuits, run simulations, and see
                                    results instantly.
                                </p>
                            </div>

                            <div className="relative z-10 mb-10 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                                {[
                                    'Drag-and-drop component placement',
                                    'Real-time signal visualization',
                                    'Step-by-step guided tutorials',
                                    'Instant feedback on errors',
                                    'Save and share your designs',
                                    'No installation required',
                                ].map((benefit, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="bg-primary/20 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full">
                                            <Check className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="text-foreground/80 text-sm font-medium">
                                            {benefit}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="relative z-10 text-center">
                                <Link href="/playground">
                                    <Button size="lg" variant="glow" className="px-10">
                                        <Play className="mr-2 h-5 w-5" />
                                        Try Playground
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Topics Section */}
            <section id="topics" className="bg-background px-4 py-24">
                <div className="mx-auto max-w-7xl">
                    <FadeIn direction="up" className="mb-16 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                            Explore Topics
                        </h2>
                        <p className="mx-auto max-w-2xl text-lg text-text-secondary">
                            Discover components across 11 categories, from basic logic gates to
                            advanced processors.
                        </p>
                    </FadeIn>

                    <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {categories.map((category) => (
                            <motion.div key={category.id} variants={fadeInItemVariants}>
                                <CategoryCard
                                    {...category}
                                    href={`/templates?category=${category.id}`}
                                />
                            </motion.div>
                        ))}
                    </StaggerContainer>
                </div>
            </section>

            {/* Templates Section */}
            <section className="bg-surface-secondary/50 px-4 py-24">
                <div className="mx-auto max-w-7xl">
                    <FadeIn direction="up" className="mb-16 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                            Practice Circuits
                        </h2>
                        <p className="mx-auto max-w-2xl text-lg text-text-secondary">
                            Start with guided templates and build your way up to complex systems.
                        </p>
                    </FadeIn>

                    <StaggerContainer className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {featuredTemplates.map((template) => (
                            <motion.div key={template.id} variants={fadeInItemVariants}>
                                <TemplateCard {...template} href={`/templates/${template.id}`} />
                            </motion.div>
                        ))}
                    </StaggerContainer>

                    <FadeIn direction="up" delay={0.4} className="text-center">
                        <Link href="/templates">
                            <Button variant="secondary" size="lg" className="px-8">
                                View All Templates
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </FadeIn>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="relative overflow-hidden px-4 py-32">
                <div className="absolute inset-0 bg-gradient-to-br from-background via-surface-secondary to-background" />
                <div className="bg-primary/10 absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow rounded-full blur-3xl" />

                <FadeIn direction="up" className="relative z-10 mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
                        Ready to start your <GradientText>Journey</GradientText>?
                    </h2>
                    <p className="mx-auto mb-10 max-w-2xl text-xl text-text-secondary">
                        No account required. Create a session and start building circuits in
                        seconds.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
                        <Button
                            onClick={handleCreateSession}
                            disabled={isCreating}
                            size="lg"
                            variant="glow"
                            className="px-10 py-6 text-lg"
                        >
                            {isCreating ? <Spinner size="sm" /> : <Zap className="mr-2 h-5 w-5" />}
                            Get Started Free
                        </Button>
                        <Link href="/templates">
                            <Button
                                size="lg"
                                variant="secondary"
                                className="border-2 border-border px-10 py-6 text-lg"
                            >
                                Explore Templates
                            </Button>
                        </Link>
                    </div>
                </FadeIn>
            </section>

            {/* Footer */}
            <Footer />

            {/* Join Session Modal */}
            <Modal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                title="Join a Session"
            >
                <form onSubmit={handleJoinSession} className="space-y-4">
                    <Input
                        label="Session Code"
                        placeholder="Enter 6-character code or paste link"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        error={error}
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
                            className="flex-1"
                            variant="primary"
                        >
                            {isJoining ? <Spinner size="sm" className="mr-2" /> : null}
                            Join
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
// I need to make sure I imported Navbar.
// The original file imported { Button, Input, ... } from '@/components/ui'
// I'll update the import list to include Navbar.
