'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap, Users, BookOpen, Sparkles, Play, Share2, Cpu, ArrowRight,
  Monitor, Check, Grid, Battery, Calculator,
  CircuitBoard, Gauge, ToggleLeft, Layers, Radio, Timer
} from 'lucide-react';
import {
  Button, Input, Spinner, Modal, GradientText,
  AnimatedCounter, CategoryCard, TemplateCard, Navbar, Footer,
  FadeIn, StaggerContainer, fadeInItemVariants
} from '@/components/ui';
import { useSessionRecovery } from '@/hooks';
import { api } from '@/services/api';

// Stats data
const stats = [
  { value: 60, suffix: '+', label: 'Components', icon: <Cpu className="w-5 h-5" /> },
  { value: 30, suffix: '+', label: 'Templates', icon: <BookOpen className="w-5 h-5" /> },
  { value: 11, suffix: '', label: 'Categories', icon: <Grid className="w-5 h-5" /> },
  { value: 100, suffix: '%', label: 'Free', icon: <Sparkles className="w-5 h-5" /> },
];

// Categories data
const categories = [
  { id: 'logic-gates', name: 'Logic Gates', icon: <CircuitBoard className="w-6 h-6" />, count: 12, description: 'AND, OR, NOT, XOR and more' },
  { id: 'flip-flops', name: 'Flip-Flops', icon: <ToggleLeft className="w-6 h-6" />, count: 8, description: 'SR, JK, D, T flip-flops' },
  { id: 'sensors', name: 'Sensors', icon: <Gauge className="w-6 h-6" />, count: 10, description: 'Light, temperature, motion' },
  { id: 'motors', name: 'Motors & Actuators', icon: <Radio className="w-6 h-6" />, count: 6, description: 'DC, servo, stepper motors' },
  { id: 'displays', name: 'Displays', icon: <Monitor className="w-6 h-6" />, count: 5, description: '7-segment, LCD, LED matrix' },
  { id: 'power', name: 'Power Sources', icon: <Battery className="w-6 h-6" />, count: 4, description: 'Batteries, supplies, regulators' },
  { id: 'arithmetic', name: 'Arithmetic', icon: <Calculator className="w-6 h-6" />, count: 8, description: 'Adders, multipliers, ALUs' },
  { id: 'memory', name: 'Memory', icon: <Layers className="w-6 h-6" />, count: 6, description: 'Registers, RAM, ROM' },
];

// Featured templates data
const featuredTemplates = [
  { id: 'half-adder', name: 'Half Adder', difficulty: 'beginner' as const, category: 'Arithmetic', description: 'Learn basic binary addition with XOR and AND gates' },
  { id: 'sr-latch', name: 'SR Latch', difficulty: 'beginner' as const, category: 'Memory', description: 'Build a simple set-reset memory element' },
  { id: '4bit-counter', name: '4-Bit Counter', difficulty: 'intermediate' as const, category: 'Sequential', description: 'Create a binary counter using flip-flops' },
  { id: 'alu', name: 'Simple ALU', difficulty: 'advanced' as const, category: 'Arithmetic', description: 'Build an arithmetic logic unit from scratch' },
  { id: 'traffic-light', name: 'Traffic Light Controller', difficulty: 'intermediate' as const, category: 'Automation', description: 'Design a state machine for traffic signals' },
  { id: 'decoder', name: '3-to-8 Decoder', difficulty: 'beginner' as const, category: 'Logic', description: 'Implement a binary decoder circuit' },
];

// Features data
const features = [
  { icon: <Users className="w-5 h-5" />, title: 'Real-time Collaboration', description: 'Work together with live cursor tracking' },
  { icon: <Play className="w-5 h-5" />, title: 'Live Simulation', description: 'Run and visualize signal flow instantly' },
  { icon: <BookOpen className="w-5 h-5" />, title: 'Guided Templates', description: 'Learn from 30+ step-by-step tutorials' },
  { icon: <Share2 className="w-5 h-5" />, title: 'Easy Sharing', description: 'Share with a simple 6-character code' },
  { icon: <Monitor className="w-5 h-5" />, title: 'Export & Import', description: 'Save as PNG or JSON files' },
  { icon: <Timer className="w-5 h-5" />, title: 'No Setup Required', description: 'Start building in seconds' },
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
    <div className="min-h-screen bg-background transition-colors duration-300 selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <Navbar showSessionButtons={false} />

      {/* Rejoin Session Banner */}
      {pendingSession && (
        <FadeIn direction="down" className="fixed top-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <div className="glass-card p-4 rounded-xl border border-primary/20 shadow-lg bg-surface/80 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-foreground font-medium text-sm">
                  Rejoin session {pendingSession.sessionCode}?
                </p>
                <p className="text-text-muted text-xs mt-0.5">
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
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <FadeIn direction="right" delay={0.1}>
              <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-sm font-medium mb-6 text-primary border-primary/20 bg-primary/5">
                <Sparkles className="w-4 h-4" />
                Free for Education
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-foreground mb-6 leading-tight tracking-tight">
                Master{' '}
                <GradientText>Circuit Design</GradientText>
                {' '}with Interactive Learning
              </h1>
              <p className="text-lg text-text-secondary mb-8 max-w-xl leading-relaxed">
                Build, simulate, and learn electronic circuits together in real-time.
                Perfect for teachers and students exploring digital logic, robotics, and automation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleCreateSession}
                  disabled={isCreating}
                  size="lg"
                  variant="glow"
                  className="px-8 text-lg"
                >
                  {isCreating ? <Spinner size="sm" /> : <Users className="w-5 h-5 mr-2" />}
                  Start Building
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Link href="/templates">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8 text-lg">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Browse Templates
                  </Button>
                </Link>
              </div>
            </FadeIn>

            {/* Right content - Hero illustration */}
            <FadeIn direction="left" delay={0.3} className="hidden lg:block">
              <div className="relative group">
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-surface/50 backdrop-blur-sm transition-transform duration-500 group-hover:scale-[1.02]">
                  <img
                    src="/hero-illustration.png"
                    alt="Student building electronic circuits with logic gates"
                    className="w-full h-auto rounded-2xl"
                  />
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-10" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl -z-10" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-4 border-y border-border/50 bg-surface-secondary/50">
        <div className="max-w-5xl mx-auto">
          <FadeIn direction="up" delay={0.2}>
            <div className="glass-card p-8 rounded-2xl">
              <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat) => (
                  <motion.div key={stat.label} variants={fadeInItemVariants} className="text-center">
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
      <section id="features" className="py-24 px-4 bg-background relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Feature list */}
            <FadeIn direction="right">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                Your Personal{' '}
                <GradientText>Learning Assistant</GradientText>
              </h2>
              <p className="text-text-secondary mb-10 text-lg">
                Everything you need to master circuit design, from basic logic gates to complex systems.
              </p>
              <StaggerContainer className="grid sm:grid-cols-2 gap-5">
                {features.map((feature) => (
                  <motion.div
                    key={feature.title}
                    variants={fadeInItemVariants}
                    className="glass-card p-5 rounded-xl flex items-start gap-4 hover:bg-surface/60 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm mb-1">{feature.title}</h3>
                      <p className="text-text-muted text-xs leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </StaggerContainer>
            </FadeIn>

            {/* Right - Editor preview */}
            <FadeIn direction="left" delay={0.2}>
              <div className="glass-card p-2 rounded-2xl shadow-glass-lg border-primary/10 bg-surface/30">
                <img
                  src="/editor-preview.png"
                  alt="CircuitForge editor interface showing a half-adder circuit"
                  className="w-full h-auto rounded-xl shadow-inner"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Interactive Practice Section */}
      <section className="py-24 px-4 bg-surface-secondary/30 border-y border-border/50">
        <div className="max-w-4xl mx-auto">
          <FadeIn direction="up">
            <div className="relative p-8 md:p-12 rounded-3xl overflow-hidden glass border border-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

              <div className="text-center mb-10 relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Master Circuits with{' '}
                  <GradientText>Interactive Practice</GradientText>
                </h2>
                <p className="text-text-secondary max-w-2xl mx-auto text-lg">
                  Learn by doing. Build real circuits, run simulations, and see results instantly.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-10 relative z-10">
                {[
                  'Drag-and-drop component placement',
                  'Real-time signal visualization',
                  'Step-by-step guided tutorials',
                  'Instant feedback on errors',
                  'Save and share your designs',
                  'No installation required',
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground/80 text-sm font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="text-center relative z-10">
                <Link href="/playground">
                  <Button size="lg" variant="glow" className="px-10">
                    <Play className="w-5 h-5 mr-2" />
                    Try Playground
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Topics Section */}
      <section id="topics" className="py-24 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <FadeIn direction="up" className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Explore Topics
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">
              Discover components across 11 categories, from basic logic gates to advanced processors.
            </p>
          </FadeIn>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <section className="py-24 px-4 bg-surface-secondary/50">
        <div className="max-w-7xl mx-auto">
          <FadeIn direction="up" className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Practice Circuits
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">
              Start with guided templates and build your way up to complex systems.
            </p>
          </FadeIn>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {featuredTemplates.map((template) => (
              <motion.div key={template.id} variants={fadeInItemVariants}>
                <TemplateCard
                  {...template}
                  href={`/templates/${template.id}`}
                />
              </motion.div>
            ))}
          </StaggerContainer>

          <FadeIn direction="up" delay={0.4} className="text-center">
            <Link href="/templates">
              <Button variant="secondary" size="lg" className="px-8">
                View All Templates
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-surface-secondary to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />

        <FadeIn direction="up" className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 tracking-tight">
            Ready to start your{' '}
            <GradientText>Journey</GradientText>?
          </h2>
          <p className="text-text-secondary text-xl mb-10 max-w-2xl mx-auto">
            No account required. Create a session and start building circuits in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Button
              onClick={handleCreateSession}
              disabled={isCreating}
              size="lg"
              variant="glow"
              className="px-10 py-6 text-lg"
            >
              {isCreating ? <Spinner size="sm" /> : <Zap className="w-5 h-5 mr-2" />}
              Get Started Free
            </Button>
            <Link href="/templates">
              <Button size="lg" variant="secondary" className="px-10 py-6 text-lg border-2 border-border">
                Explore Templates
              </Button>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <Footer />

      {/* Join Session Modal */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join a Session">
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
            <Button type="button" variant="secondary" onClick={() => setShowJoinModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isJoining || !joinCode.trim()} className="flex-1" variant="primary">
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
