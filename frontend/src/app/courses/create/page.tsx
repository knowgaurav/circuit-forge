'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { Sparkles, AlertTriangle, Lock, Unlock } from 'lucide-react';
import type { TopicSuggestion, CoursePlan } from '@/types';
import { APIKeyModal } from '@/components/ui/APIKeyModal';
import { Navbar, Button, Input, Spinner } from '@/components/ui';
import { useLLMConfigStore } from '@/stores/llmConfigStore';

// Category colors using semantic tokens
const categoryColors: Record<string, string> = {
    'Digital Logic': 'bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary',
    'Computing': 'bg-accent/10 border-accent/20 hover:bg-accent/20 text-accent',
    'Robotics': 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20 text-green-600 dark:text-green-400',
    'Automation': 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400',
};

const difficultyColors: Record<string, string> = {
    'Beginner': 'text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20',
    'Intermediate': 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/20',
    'Advanced': 'text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20',
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
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate course plan';
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
    const groupedSuggestions = suggestions.reduce<Record<string, TopicSuggestion[]>>((acc, suggestion) => {
        const category = suggestion.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category]!.push(suggestion);
        return acc;
    }, {});

    if (generatedPlan) {
        return (
            <div className="min-h-screen bg-background transition-colors duration-300">
                <Navbar />

                <div className="pt-24 pb-12 px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="glass-card p-8 rounded-2xl">
                            <h1 className="text-3xl font-bold text-foreground mb-2">
                                {generatedPlan.title}
                            </h1>
                            <p className="text-text-secondary mb-6">{generatedPlan.description}</p>

                            <div className="flex gap-4 mb-8">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyColors[generatedPlan.difficulty]}`}>
                                    {generatedPlan.difficulty}
                                </span>
                                <span className="text-text-muted flex items-center bg-surface-secondary px-3 py-1 rounded-full text-sm">
                                    {generatedPlan.levels.length} levels • ~{generatedPlan.estimatedHours} hours
                                </span>
                            </div>

                            <h2 className="text-xl font-semibold text-foreground mb-6">Course Outline</h2>
                            <div className="space-y-4 mb-8">
                                {generatedPlan.levels.map((level, index) => (
                                    <div
                                        key={level.levelNumber}
                                        className={`p-5 rounded-xl border transition-colors ${index === 0
                                                ? 'border-primary/30 bg-primary/5'
                                                : 'border-border bg-surface-secondary/30'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-surface-secondary text-text-muted border border-border'
                                                }`}>
                                                {level.levelNumber}
                                            </span>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-foreground">{level.title}</h3>
                                                <p className="text-sm text-text-secondary mt-0.5">{level.description}</p>
                                            </div>
                                            {index === 0 && (
                                                <div className="flex items-center gap-1.5 text-primary text-sm font-medium px-2 py-1 bg-primary/10 rounded-lg">
                                                    <Unlock className="w-4 h-4" />
                                                    Unlocked
                                                </div>
                                            )}
                                            {index > 0 && (
                                                <div className="text-text-muted">
                                                    <Lock className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button
                                    onClick={handleStartCourse}
                                    variant="glow"
                                    size="lg"
                                    className="flex-1"
                                >
                                    Start Course
                                </Button>
                                <Button
                                    onClick={handleRegeneratePlan}
                                    variant="ghost"
                                    size="lg"
                                >
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

            <div className="pt-28 pb-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 glass rounded-full text-sm font-medium mb-6 text-primary border-primary/20 bg-primary/5">
                            <Sparkles className="w-4 h-4" />
                            AI-Powered Learning
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                            Create Your Circuit Course
                        </h1>
                        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
                            Choose a topic or enter your own to generate a personalized learning path
                        </p>
                    </div>

                    {/* Custom Topic Input */}
                    <div className="glass-card p-8 rounded-2xl mb-12 shadow-glass-lg border-primary/10">
                        <h2 className="text-xl font-semibold text-foreground mb-6">Enter Your Own Topic</h2>
                        {isMounted && !llmStore.isConfigured() && (
                            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                    Please configure your API key first to generate courses.
                                    <button
                                        onClick={() => setShowApiKeyModal(true)}
                                        className="ml-2 font-medium underline hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors"
                                    >
                                        Configure now
                                    </button>
                                </p>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Input
                                type="text"
                                value={customTopic}
                                onChange={(e) => setCustomTopic(e.target.value)}
                                placeholder="e.g., 4-bit calculator, digital clock, traffic light controller..."
                                className="flex-1 text-lg py-3"
                                disabled={isLoading}
                            />
                            <Button
                                onClick={() => handleGeneratePlan(customTopic)}
                                disabled={!customTopic.trim() || isLoading || (isMounted && !llmStore.isConfigured())}
                                variant="glow"
                                size="lg"
                                className="sm:w-auto"
                            >
                                {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                                {isLoading ? 'Generating...' : 'Generate Course'}
                            </Button>
                        </div>
                        {error && (
                            <p className="mt-3 text-error text-sm font-medium px-2">{error}</p>
                        )}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="glass-card p-12 rounded-2xl mb-12 text-center animate-fade-in-up">
                            <div className="flex justify-center mb-6">
                                <Spinner size="lg" className="text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">Generating your course...</h3>
                            <p className="text-text-secondary">Using AI to build a personalized curriculum. This may take up to 30 seconds.</p>
                        </div>
                    )}

                    {/* Suggested Topics */}
                    {!isLoading && (
                        <div className="animate-fade-in-up animation-delay-200">
                            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Or Choose a Suggested Topic</h2>
                            {Object.entries(groupedSuggestions).map(([category, items]) => (
                                <div key={category} className="mb-10 last:mb-0">
                                    <h3 className="text-lg font-semibold text-text-muted mb-4 px-1">{category}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {items.map((suggestion) => (
                                            <div
                                                key={suggestion.topic}
                                                className="relative group h-full"
                                            >
                                                <button
                                                    onClick={() => (isMounted && llmStore.isConfigured()) ? handleGeneratePlan(suggestion.topic) : setShowApiKeyModal(true)}
                                                    className={`w-full h-full p-5 rounded-xl border text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${isMounted && !llmStore.isConfigured() ? 'opacity-60 grayscale' : ''
                                                        } ${categoryColors[category] || 'bg-surface-secondary border-border hover:border-primary/30'}`}
                                                >
                                                    <h4 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                                        {suggestion.title}
                                                    </h4>
                                                    <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                                                        {suggestion.description}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-auto">
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${difficultyColors[suggestion.difficulty]}`}>
                                                            {suggestion.difficulty}
                                                        </span>
                                                        <span className="text-xs text-text-muted font-medium">
                                                            ~{suggestion.estimatedLevels} levels
                                                        </span>
                                                    </div>
                                                </button>

                                                {isMounted && !llmStore.isConfigured() && (
                                                    <button
                                                        onClick={() => setShowApiKeyModal(true)}
                                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-surface/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-yellow-500/50"
                                                    >
                                                        <div className="text-center px-4 transform scale-95 group-hover:scale-100 transition-transform">
                                                            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                                                            <p className="text-sm font-bold text-foreground">Configure API Key</p>
                                                            <span className="text-xs text-text-secondary">Click to setup</span>
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
