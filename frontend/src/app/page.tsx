'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap, Users, BookOpen, Sparkles, Play, Share2, Cpu, ArrowRight,
  Monitor, Check, Grid, Battery, Calculator,
  CircuitBoard, Gauge, ToggleLeft, Layers, Radio, Timer, Menu, X
} from 'lucide-react';
import {
  Button, Input, Spinner, Modal, GradientText,
  AnimatedCounter, CategoryCard, TemplateCard
} from '@/components/ui';
import { useInView, useSessionRecovery } from '@/hooks';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Session recovery - check for pending session to rejoin
  const { pendingSession, clearPendingSession } = useSessionRecovery();

  const handleRejoinSession = () => {
    if (pendingSession) {
      router.push(`/session/${pendingSession.sessionCode}`);
    }
  };

  const handleDismissRejoin = () => {
    clearPendingSession();
  };

  // Viewport animation refs
  const [heroRef, heroInView] = useInView<HTMLDivElement>();
  const [statsRef, statsInView] = useInView<HTMLDivElement>();
  const [featuresRef, featuresInView] = useInView<HTMLDivElement>();
  const [practiceRef, practiceInView] = useInView<HTMLDivElement>();
  const [topicsRef, topicsInView] = useInView<HTMLDivElement>();
  const [templatesRef, templatesInView] = useInView<HTMLDivElement>();
  const [ctaRef, ctaInView] = useInView<HTMLDivElement>();

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
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">CircuitForge</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                Features
              </Link>
              <Link href="#topics" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                Topics
              </Link>
              <Link href="/templates" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                Templates
              </Link>
              <Link href="/courses/create" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                AI Courses
              </Link>
              <Link href="/playground" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                Playground
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowJoinModal(true)} className="text-gray-300 hover:text-white">
                Join Session
              </Button>
              <button
                onClick={handleCreateSession}
                disabled={isCreating}
                className="gradient-btn px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2"
              >
                {isCreating ? <Spinner size="sm" /> : 'Create Session'}
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-white/5 px-4 py-4 space-y-3">
            <Link href="#features" className="block text-gray-400 hover:text-white text-sm font-medium">Features</Link>
            <Link href="#topics" className="block text-gray-400 hover:text-white text-sm font-medium">Topics</Link>
            <Link href="/templates" className="block text-gray-400 hover:text-white text-sm font-medium">Templates</Link>
            <Link href="/courses/create" className="block text-gray-400 hover:text-white text-sm font-medium">AI Courses</Link>
            <Link href="/playground" className="block text-gray-400 hover:text-white text-sm font-medium">Playground</Link>
            <div className="pt-3 border-t border-white/10 space-y-2">
              <Button variant="ghost" size="sm" onClick={() => setShowJoinModal(true)} className="w-full text-gray-300">
                Join Session
              </Button>
              <button
                onClick={handleCreateSession}
                disabled={isCreating}
                className="gradient-btn w-full px-4 py-2 rounded-lg text-white text-sm font-medium"
              >
                {isCreating ? <Spinner size="sm" /> : 'Create Session'}
              </button>
            </div>
          </div>
        )}
      </nav>


      {/* Rejoin Session Banner */}
      {pendingSession && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <div className="glass-card p-4 rounded-xl border border-purple-500/30 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-white font-medium text-sm">
                  Rejoin session {pendingSession.sessionCode}?
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  as {pendingSession.displayName}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismissRejoin}
                  className="text-gray-400 hover:text-white"
                >
                  Dismiss
                </Button>
                <button
                  onClick={handleRejoinSession}
                  className="gradient-btn px-3 py-1.5 rounded-lg text-white text-sm font-medium"
                >
                  Rejoin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="pt-32 pb-20 px-4 relative overflow-hidden"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className={`${heroInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-sm font-medium mb-6 text-purple-300">
                <Sparkles className="w-4 h-4" />
                Free for Education
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Master{' '}
                <GradientText>Circuit Design</GradientText>
                {' '}with Interactive Learning
              </h1>
              <p className="text-lg text-gray-400 mb-8 max-w-xl">
                Build, simulate, and learn electronic circuits together in real-time.
                Perfect for teachers and students exploring digital logic, robotics, and automation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleCreateSession}
                  disabled={isCreating}
                  className="gradient-btn px-6 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-lg"
                >
                  {isCreating ? <Spinner size="sm" /> : <Users className="w-5 h-5" />}
                  Start Building
                  <ArrowRight className="w-5 h-5" />
                </button>
                <Link href="/templates">
                  <button className="px-6 py-3 rounded-xl text-white font-medium border border-white/20 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 w-full">
                    <BookOpen className="w-5 h-5" />
                    Browse Templates
                  </button>
                </Link>
              </div>
            </div>

            {/* Right content - Hero illustration */}
            <div className={`${heroInView ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'} hidden lg:block`}>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden">
                  <img
                    src="/hero-illustration.png"
                    alt="Student building electronic circuits with logic gates"
                    className="w-full h-auto rounded-2xl"
                  />
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-purple-500/20 rounded-full blur-xl" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section ref={statsRef} className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`glass-card p-8 rounded-2xl ${statsInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <AnimatedCounter
                  key={stat.label}
                  end={stat.value}
                  suffix={stat.suffix}
                  label={stat.label}
                  icon={stat.icon}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Feature list */}
            <div className={`${featuresInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Your Personal{' '}
                <GradientText>Learning Assistant</GradientText>
              </h2>
              <p className="text-gray-400 mb-8">
                Everything you need to master circuit design, from basic logic gates to complex systems.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="glass-card p-4 rounded-xl flex items-start gap-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-white text-sm">{feature.title}</h3>
                      <p className="text-gray-500 text-xs mt-1">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Editor preview */}
            <div className={`${featuresInView ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
              <div className="glass-card p-2 rounded-2xl">
                <img
                  src="/editor-preview.png"
                  alt="CircuitForge editor interface showing a half-adder circuit"
                  className="w-full h-auto rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Interactive Practice Section */}
      <section ref={practiceRef} className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`gradient-border p-8 md:p-12 ${practiceInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Master Circuits with{' '}
                <GradientText>Interactive Practice</GradientText>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Learn by doing. Build real circuits, run simulations, and see results instantly.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              {[
                'Drag-and-drop component placement',
                'Real-time signal visualization',
                'Step-by-step guided tutorials',
                'Instant feedback on errors',
                'Save and share your designs',
                'No installation required',
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-300 text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Link href="/playground">
                <button className="gradient-btn px-8 py-3 rounded-xl text-white font-medium inline-flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Try Playground
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Topics Section */}
      <section id="topics" ref={topicsRef} className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-12 ${topicsInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Explore Topics
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Discover components across 11 categories, from basic logic gates to advanced processors.
            </p>
          </div>

          <div className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-4 ${topicsInView ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                {...category}
                href={`/templates?category=${category.id}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section ref={templatesRef} className="py-20 px-4 bg-gradient-to-b from-transparent to-purple-900/10">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-12 ${templatesInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Practice Circuits
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Start with guided templates and build your way up to complex systems.
            </p>
          </div>

          <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 ${templatesInView ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
            {featuredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                {...template}
                href={`/templates/${template.id}`}
              />
            ))}
          </div>

          <div className={`text-center ${templatesInView ? 'animate-fade-in-up animation-delay-300' : 'opacity-0'}`}>
            <Link href="/templates">
              <button className="px-6 py-3 rounded-xl text-white font-medium border border-white/20 hover:bg-white/5 transition-colors inline-flex items-center gap-2">
                View All Templates
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section ref={ctaRef} className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 to-blue-900/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl" />

        <div className={`max-w-3xl mx-auto text-center relative ${ctaInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to start your{' '}
            <GradientText>Journey</GradientText>?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            No account required. Create a session and start building circuits in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCreateSession}
              disabled={isCreating}
              className="gradient-btn px-8 py-4 rounded-xl text-white font-medium text-lg flex items-center gap-2 animate-glow-pulse"
            >
              {isCreating ? <Spinner size="sm" /> : <Zap className="w-5 h-5" />}
              Get Started Free
            </button>
            <Link href="/templates">
              <button className="px-8 py-4 rounded-xl text-white font-medium border border-white/20 hover:bg-white/5 transition-colors">
                Explore Templates
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">CircuitForge</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-400">
              <Link href="/templates" className="hover:text-white transition-colors">Templates</Link>
              <Link href="/courses/create" className="hover:text-white transition-colors">AI Courses</Link>
              <Link href="/playground" className="hover:text-white transition-colors">Playground</Link>
              <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            </div>
            <p className="text-sm text-gray-500">
              Sessions expire after 24 hours of inactivity
            </p>
          </div>
        </div>
      </footer>

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
            <Button type="submit" disabled={isJoining || !joinCode.trim()} className="flex-1">
              {isJoining ? <Spinner size="sm" className="mr-2" /> : null}
              Join
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
