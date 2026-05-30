'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { Sparkles, AlertTriangle, Lock, Unlock } from 'lucide-react';

import { APIKeyModal } from '@/components/ui/APIKeyModal';

import { Navbar, Button, Input, Spinner } from '@/components/ui';

import { api } from '@/services/api';
import { useLLMConfigStore } from '@/stores/llmConfigStore';

import type { TopicSuggestion, CoursePlan } from '@/types';

// Category colors using semantic tokens
const categoryColors: Record<string, string> = {
    'Digital Logic': 'bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary',
    Computing: 'bg-accent/10 border-accent/20 hover:bg-accent/20 text-accent',
    Robotics: 'bg-success/10 border-success/20 hover:bg-success/20 text-success',
    Automation: 'bg-warning/10 border-warning/20 hover:bg-warning/20 text-warning',
};

const difficultyColors: Record<string, string> = {
    Beginner: 'text-success bg-success/10 border border-success/30',
    Intermediate: 'text-warning bg-warning/10 border border-warning/30',
    Advanced: 'text-error bg-error/10 border border-error/30',
};

export default function CreateCoursePage() {
    const router = useRouter();
    const llmStore = useLLMConfigStore();
    const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
    const [customTopic, setCustomTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedPlan, setGeneratedPlan] = useState<CoursePlan | null>(null);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [pendingTopic, setPendingTopic] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        loadSuggestions();
        // Show modal on page load if not configured
        if (!llmStore.isConfigured()) {
            setShowApiKeyModal(true);
        }
    }, []);

    const loadSuggestions = async () => {
        try {
            const data = await api.getTopicSuggestions();
            setSuggestions(data);
        } catch (err) {
            console.error('Failed to load suggestions:', err);
        }
    };

    const handleGeneratePlan = async (topic: string) => {
        // Check if configured, if not show modal and save topic for later
        if (!llmStore.isConfigured()) {
            setPendingTopic(topic);
            setShowApiKeyModal(true);
            return;
        }

        const config = llmStore.getConfig();
        if (!config) {
            setError('Please configure your LLM provider first');
            setShowApiKeyModal(true);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const { coursePlan } = await api.generateCoursePlan(topic, config);
            setGeneratedPlan(coursePlan);
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to generate course plan';
            setError(errorMessage);
            // Keep topic input on error for retry
        } finally {
            setIsLoading(false);
        }
    };

    const handleApiKeySaved = () => {
        setShowApiKeyModal(false);
        // If there was a pending topic, generate it now
        if (pendingTopic) {
            handleGeneratePlan(pendingTopic);
            setPendingTopic(null);
        }
    };

    const handleStartCourse = async () => {
        if (!generatedPlan) return;
        // Navigate to course page
        router.push(`/courses/${generatedPlan.id}`);
    };

    const handleRegeneratePlan = () => {
        setGeneratedPlan(null);
    };

    // Group suggestions by category
    const groupedSuggestions = suggestions.reduce<Record<string, TopicSuggestion[]>>(
        (acc, suggestion) => {
            const category = suggestion.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category]!.push(suggestion);
            return acc;
        },
        {}
    );

    if (generatedPlan) {
        return (
            <div className="min-h-screen bg-background transition-colors duration-300">
                <Navbar />

                <div className="px-4 pb-12 pt-24">
                    <div className="mx-auto max-w-4xl">
                        <div className="glass-card rounded-2xl p-8">
                            <h1 className="mb-2 text-3xl font-bold text-foreground">
                                {generatedPlan.title}
                            </h1>
                            <p className="mb-6 text-text-secondary">{generatedPlan.description}</p>

                            <div className="mb-8 flex gap-4">
                                <span
                                    className={`rounded-full px-3 py-1 text-sm font-medium ${difficultyColors[generatedPlan.difficulty]}`}
                                >
                                    {generatedPlan.difficulty}
                                </span>
                                <span className="flex items-center rounded-full bg-surface-secondary px-3 py-1 text-sm text-text-muted">
                                    {generatedPlan.levels.length} levels • ~
                                    {generatedPlan.estimatedHours} hours
                                </span>
                            </div>

                            <h2 className="mb-6 text-xl font-semibold text-foreground">
                                Course Outline
                            </h2>
                            <div className="mb-8 space-y-4">
                                {generatedPlan.levels.map((level, index) => (
                                    <div
                                        key={level.levelNumber}
                                        className={`rounded-xl border p-5 transition-colors ${
                                            index === 0
                                                ? 'border-primary/30 bg-primary/5'
                                                : 'bg-surface-secondary/30 border-border'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span
                                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                                    index === 0
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'border border-border bg-surface-secondary text-text-muted'
                                                }`}
                                            >
                                                {level.levelNumber}
                                            </span>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-foreground">
                                                    {level.title}
                                                </h3>
                                                <p className="mt-0.5 text-sm text-text-secondary">
                                                    {level.description}
                                                </p>
                                            </div>
                                            {index === 0 && (
                                                <div className="bg-primary/10 flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-primary">
                                                    <Unlock className="h-4 w-4" />
                                                    Unlocked
                                                </div>
                                            )}
                                            {index > 0 && (
                                                <div className="text-text-muted">
                                                    <Lock className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-4 sm:flex-row">
                                <Button
                                    onClick={handleStartCourse}
                                    variant="glow"
                                    size="lg"
                                    className="flex-1"
                                >
                                    Start Course
                                </Button>
                                <Button onClick={handleRegeneratePlan} variant="ghost" size="lg">
                                    Regenerate
                                </Button>
                                <Button
                                    onClick={() => setGeneratedPlan(null)}
                                    variant="secondary"
                                    size="lg"
                                >
                                    Change Topic
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />

            {/* API Key Modal */}
            <APIKeyModal
                isOpen={showApiKeyModal}
                onClose={() => setShowApiKeyModal(false)}
                onSave={handleApiKeySaved}
            />

            <div className="px-4 pb-12 pt-28">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-10 text-center">
                        <div className="glass border-primary/20 bg-primary/5 mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-primary">
                            <Sparkles className="h-4 w-4" />
                            AI-Powered Learning
                        </div>
                        <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
                            Create Your Circuit Course
                        </h1>
                        <p className="mx-auto max-w-2xl text-lg text-text-secondary">
                            Choose a topic or enter your own to generate a personalized learning
                            path
                        </p>
                    </div>

                    {/* Custom Topic Input */}
                    <div className="glass-card border-primary/10 mb-12 rounded-2xl p-8 shadow-glass-lg">
                        <h2 className="mb-6 text-xl font-semibold text-foreground">
                            Enter Your Own Topic
                        </h2>
                        {isMounted && !llmStore.isConfigured() && (
                            <div className="border-warning/30 bg-warning/10 mb-6 flex items-center gap-3 rounded-xl border p-4">
                                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
                                <p className="text-sm text-warning">
                                    Please configure your API key first to generate courses.
                                    <button
                                        onClick={() => setShowApiKeyModal(true)}
                                        className="ml-2 font-medium underline transition-colors hover:text-foreground"
                                    >
                                        Configure now
                                    </button>
                                </p>
                            </div>
                        )}
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <Input
                                type="text"
                                value={customTopic}
                                onChange={(e) => setCustomTopic(e.target.value)}
                                placeholder="e.g., 4-bit calculator, digital clock, traffic light controller..."
                                className="flex-1 py-3 text-lg"
                                disabled={isLoading}
                            />
                            <Button
                                onClick={() => handleGeneratePlan(customTopic)}
                                disabled={
                                    !customTopic.trim() ||
                                    isLoading ||
                                    (isMounted && !llmStore.isConfigured())
                                }
                                variant="glow"
                                size="lg"
                                className="sm:w-auto"
                            >
                                {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                                {isLoading ? 'Generating...' : 'Generate Course'}
                            </Button>
                        </div>
                        {error && (
                            <p className="mt-3 px-2 text-sm font-medium text-error">{error}</p>
                        )}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="glass-card mb-12 animate-fade-in-up rounded-2xl p-12 text-center">
                            <div className="mb-6 flex justify-center">
                                <Spinner size="lg" className="text-primary" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-foreground">
                                Generating your course...
                            </h3>
                            <p className="text-text-secondary">
                                Using AI to build a personalized curriculum. This may take up to 30
                                seconds.
                            </p>
                        </div>
                    )}

                    {/* Suggested Topics */}
                    {!isLoading && (
                        <div className="animation-delay-200 animate-fade-in-up">
                            <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
                                Or Choose a Suggested Topic
                            </h2>
                            {Object.entries(groupedSuggestions).map(([category, items]) => (
                                <div key={category} className="mb-10 last:mb-0">
                                    <h3 className="mb-4 px-1 text-lg font-semibold text-text-muted">
                                        {category}
                                    </h3>
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                                        {items.map((suggestion) => (
                                            <div
                                                key={suggestion.topic}
                                                className="group relative h-full"
                                            >
                                                <button
                                                    onClick={() =>
                                                        isMounted && llmStore.isConfigured()
                                                            ? handleGeneratePlan(suggestion.topic)
                                                            : setShowApiKeyModal(true)
                                                    }
                                                    className={`h-full w-full rounded-xl border p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                                                        isMounted && !llmStore.isConfigured()
                                                            ? 'opacity-60 grayscale'
                                                            : ''
                                                    } ${categoryColors[category] || 'hover:border-primary/30 border-border bg-surface-secondary'}`}
                                                >
                                                    <h4 className="mb-2 font-bold text-foreground transition-colors group-hover:text-primary">
                                                        {suggestion.title}
                                                    </h4>
                                                    <p className="mb-4 line-clamp-2 text-sm text-text-secondary">
                                                        {suggestion.description}
                                                    </p>
                                                    <div className="mt-auto flex items-center gap-3">
                                                        <span
                                                            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${difficultyColors[suggestion.difficulty]}`}
                                                        >
                                                            {suggestion.difficulty}
                                                        </span>
                                                        <span className="text-xs font-medium text-text-muted">
                                                            ~{suggestion.estimatedLevels} levels
                                                        </span>
                                                    </div>
                                                </button>

                                                {isMounted && !llmStore.isConfigured() && (
                                                    <button
                                                        onClick={() => setShowApiKeyModal(true)}
                                                        className="border-warning/50 bg-surface/80 absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100"
                                                    >
                                                        <div className="scale-95 transform px-4 text-center transition-transform group-hover:scale-100">
                                                            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-warning" />
                                                            <p className="text-sm font-bold text-foreground">
                                                                Configure API Key
                                                            </p>
                                                            <span className="text-xs text-text-secondary">
                                                                Click to setup
                                                            </span>
                                                        </div>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
