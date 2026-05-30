'use client';

import { useState, useEffect, useCallback } from 'react';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

import { APIKeyModal } from '@/components/ui/APIKeyModal';
import { Navbar } from '@/components/ui/Navbar';

import { EmbeddedPlayground } from '@/components/circuit';

import { api } from '@/services/api';
import { loadCircuitFromBlueprint, validateBlueprint } from '@/services/blueprintLoader';
import { useCircuitStore } from '@/stores/circuitStore';
import { useLLMConfigStore } from '@/stores/llmConfigStore';

import type { CoursePlan, LevelContent, LevelOutline } from '@/types';

export default function LevelPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.courseId as string;
    const levelNum = parseInt(params.levelNum as string, 10);
    const llmStore = useLLMConfigStore();

    const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
    const [levelContent, setLevelContent] = useState<LevelContent | null>(null);
    const [levelOutline, setLevelOutline] = useState<LevelOutline | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'theory' | 'practical'>('theory');
    const [blueprintLoaded, setBlueprintLoaded] = useState(false);
    const [blueprintErrors, setBlueprintErrors] = useState<string[]>([]);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);

    // Circuit store actions
    const setComponents = useCircuitStore((s) => s.setComponents);
    const setWires = useCircuitStore((s) => s.setWires);
    const reset = useCircuitStore((s) => s.reset);

    useEffect(() => {
        loadLevel();
        // Reset circuit when level changes
        reset();
        setBlueprintLoaded(false);
        setBlueprintErrors([]);
    }, [courseId, levelNum, reset]);

    const loadLevel = async () => {
        // Check if LLM is configured
        if (!llmStore.isConfigured()) {
            setShowApiKeyModal(true);
            setIsLoading(false);
            return;
        }

        const config = llmStore.getConfig();
        if (!config) {
            setShowApiKeyModal(true);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            // Load course plan
            const plan = await api.getCoursePlan(courseId);
            setCoursePlan(plan);

            // Find level outline
            const outline = plan.levels.find((l) => l.levelNumber === levelNum);
            setLevelOutline(outline || null);

            // Load level content with LLM config
            const { content, isGenerating: generating } = await api.getLevelContent(
                courseId,
                levelNum,
                config
            );
            setLevelContent(content);
            setIsGenerating(generating);

            // If still generating, poll for updates
            if (generating) {
                pollForContent();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load level');
        } finally {
            setIsLoading(false);
        }
    };

    const pollForContent = async () => {
        const config = llmStore.getConfig();
        if (!config) return;

        const interval = setInterval(async () => {
            try {
                const { content, isGenerating: generating } = await api.getLevelContent(
                    courseId,
                    levelNum,
                    config
                );
                if (!generating && content?.generationState === 'generated') {
                    setLevelContent(content);
                    setIsGenerating(false);
                    clearInterval(interval);
                }
            } catch {
                // Ignore polling errors
            }
        }, 3000);

        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(interval), 120000);
    };

    const handleApiKeySaved = () => {
        setShowApiKeyModal(false);
        loadLevel();
    };

    const practical = levelContent?.practical;

    const handleLoadBlueprint = useCallback(() => {
        if (!practical?.circuitBlueprint) {
            setBlueprintErrors(['No circuit blueprint available for this level']);
            return;
        }

        // Validate blueprint first
        const validationErrors = validateBlueprint(practical.circuitBlueprint);
        if (validationErrors.length > 0) {
            setBlueprintErrors(validationErrors);
            return;
        }

        // Load the blueprint
        const { components, wires, errors, warnings } = loadCircuitFromBlueprint(
            practical.circuitBlueprint
        );

        // Only show actual errors, not warnings (warnings are for skipped wires)
        if (errors.length > 0) {
            setBlueprintErrors(errors);
        } else if (warnings.length > 0) {
            // Show warnings but still load the circuit
            setBlueprintErrors(warnings.map((w) => `⚠️ ${w}`));
        } else {
            setBlueprintErrors([]);
        }

        // Set the circuit state (even if there are warnings)
        setComponents(components);
        setWires(wires);
        setBlueprintLoaded(true);
    }, [practical?.circuitBlueprint, setComponents, setWires]);

    const handleClearCircuit = useCallback(() => {
        reset();
        setBlueprintLoaded(false);
        setBlueprintErrors([]);
    }, [reset]);

    const handleCompleteLevel = async () => {
        const participantId = localStorage.getItem('participantId');
        if (!participantId) return;

        try {
            const courses = await api.getMyCourses(participantId);
            const enrolled = courses.find((c) => c.coursePlan.id === courseId);
            if (!enrolled) return;

            const { nextLevel } = await api.completeLevel(
                courseId,
                levelNum,
                enrolled.enrollment.id
            );

            if (nextLevel) {
                router.push(`/courses/${courseId}/level/${nextLevel}`);
            } else {
                // Course completed!
                router.push(`/courses/${courseId}?completed=true`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete level');
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background transition-colors duration-300">
                <div className="text-center">
                    <div className="spinner-brand mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4"></div>
                    <p className="text-text-secondary">Loading level...</p>
                </div>
            </div>
        );
    }

    if (showApiKeyModal) {
        return (
            <APIKeyModal
                isOpen={showApiKeyModal}
                onClose={() => router.push(`/courses/${courseId}`)}
                onSave={handleApiKeySaved}
            />
        );
    }

    if (isGenerating) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background transition-colors duration-300">
                <div className="max-w-md text-center">
                    <div className="spinner-brand mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4"></div>
                    <h2 className="mb-2 text-xl font-semibold text-text">
                        Generating Your Personalized Content
                    </h2>
                    <p className="mb-4 text-text-secondary">
                        Our AI is creating custom learning materials for this level. This usually
                        takes 15-30 seconds.
                    </p>
                    <div className="glass-card text-brand-muted rounded-xl p-4 text-sm">
                        Tip: While you wait, you can review previous levels or explore the course
                        outline.
                    </div>
                </div>
            </div>
        );
    }

    if (error || !coursePlan || !levelOutline) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background transition-colors duration-300">
                <div className="text-center">
                    <p className="mb-4 text-error">{error || 'Level not found'}</p>
                    <Link href={`/courses/${courseId}`} className="text-brand-link">
                        Back to course
                    </Link>
                </div>
            </div>
        );
    }

    const theory = levelContent?.theory;

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />

            {/* Content */}
            <div className="px-4 pb-12 pt-24">
                <div className="mx-auto max-w-6xl">
                    {/* Level Header */}
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-text-muted">
                                Level {levelNum} of {coursePlan.levels.length}
                            </p>
                            <h1 className="text-xl font-semibold text-text">
                                {levelOutline.title}
                            </h1>
                        </div>
                        <button
                            onClick={handleCompleteLevel}
                            className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:brightness-110"
                        >
                            Complete Level
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="mb-6 flex gap-2">
                        <button
                            onClick={() => setActiveTab('theory')}
                            className={`rounded-xl px-6 py-3 font-medium transition-colors ${
                                activeTab === 'theory'
                                    ? 'gradient-btn text-foreground'
                                    : 'glass-card text-text-secondary hover:text-foreground'
                            }`}
                        >
                            📖 Theory
                        </button>
                        <button
                            onClick={() => setActiveTab('practical')}
                            className={`rounded-xl px-6 py-3 font-medium transition-colors ${
                                activeTab === 'practical'
                                    ? 'gradient-btn text-foreground'
                                    : 'glass-card text-text-secondary hover:text-foreground'
                            }`}
                        >
                            🔧 Practical
                        </button>
                    </div>

                    {/* Theory Tab */}
                    {activeTab === 'theory' && theory && (
                        <div className="space-y-6">
                            {/* Learning Objectives */}
                            <div className="glass-card rounded-2xl p-6">
                                <h2 className="mb-4 text-lg font-semibold text-foreground">
                                    🎯 Learning Objectives
                                </h2>
                                <ul className="space-y-2">
                                    {theory.objectives.map((obj, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="mt-1 text-success">✓</span>
                                            <span className="text-text-secondary">{obj}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Concept Explanation */}
                            <div className="glass-card rounded-2xl p-6">
                                <h2 className="mb-4 text-lg font-semibold text-foreground">
                                    📚 Concept Explanation
                                </h2>
                                <div className="prose max-w-none">
                                    <p className="whitespace-pre-wrap text-text-secondary">
                                        {theory.conceptExplanation}
                                    </p>
                                </div>
                            </div>

                            {/* Real World Examples */}
                            {theory.realWorldExamples.length > 0 && (
                                <div className="glass-card rounded-2xl p-6">
                                    <h2 className="mb-4 text-lg font-semibold text-foreground">
                                        🌍 Real World Examples
                                    </h2>
                                    <ul className="space-y-3">
                                        {theory.realWorldExamples.map((example, i) => (
                                            <li
                                                key={i}
                                                className="bg-brand-subtle border-brand-subtle flex items-start gap-3 rounded-xl border p-3"
                                            >
                                                <span className="text-brand-link">💡</span>
                                                <span className="text-text-secondary">
                                                    {example}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Key Terms */}
                            {theory.keyTerms.length > 0 && (
                                <div className="glass-card rounded-2xl p-6">
                                    <h2 className="mb-4 text-lg font-semibold text-foreground">
                                        📝 Key Terms
                                    </h2>
                                    <div className="grid gap-3">
                                        {theory.keyTerms.map((term, i) => (
                                            <div
                                                key={i}
                                                className="rounded-xl border border-border bg-surface-secondary p-3"
                                            >
                                                <span className="font-medium text-foreground">
                                                    {term.term}:
                                                </span>{' '}
                                                <span className="text-text-muted">
                                                    {term.definition}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Practical Tab */}
                    {activeTab === 'practical' && practical && (
                        <div className="space-y-6">
                            {/* Components Needed */}
                            <div className="glass-card rounded-2xl p-6">
                                <h2 className="mb-4 text-lg font-semibold text-foreground">
                                    🧩 Components Needed
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {practical.componentsNeeded.map((comp, i) => (
                                        <span
                                            key={i}
                                            className="rounded-lg border border-border bg-surface-tertiary px-3 py-2 text-sm font-medium text-text-secondary"
                                        >
                                            {comp.type} × {comp.count}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Build Steps */}
                            <div className="glass-card rounded-2xl p-6">
                                <h2 className="mb-4 text-lg font-semibold text-foreground">
                                    📋 Build Steps
                                </h2>
                                <div className="space-y-4">
                                    {practical.steps.map((step) => (
                                        <div key={step.stepNumber} className="flex gap-4">
                                            <span className="bg-primary/15 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-medium text-primary">
                                                {step.stepNumber}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-text-secondary">
                                                    {step.instruction}
                                                </p>
                                                {step.hint && (
                                                    <p className="mt-1 text-sm text-text-muted">
                                                        💡 Hint: {step.hint}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Expected Behavior */}
                            <div className="glass-card rounded-2xl p-6">
                                <h2 className="mb-4 text-lg font-semibold text-foreground">
                                    ✅ Expected Behavior
                                </h2>
                                <p className="text-text-secondary">{practical.expectedBehavior}</p>
                            </div>

                            {/* Common Mistakes */}
                            {practical.commonMistakes.length > 0 && (
                                <div className="glass-card rounded-2xl p-6">
                                    <h2 className="mb-4 text-lg font-semibold text-foreground">
                                        ⚠️ Common Mistakes to Avoid
                                    </h2>
                                    <ul className="space-y-2">
                                        {practical.commonMistakes.map((mistake, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2 text-text-secondary"
                                            >
                                                <span className="text-error">✗</span>
                                                <span>{mistake}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Circuit Canvas */}
                            <div className="glass-card rounded-2xl p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-foreground">
                                        🔌 Build Your Circuit
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        {practical.circuitBlueprint && !blueprintLoaded && (
                                            <button
                                                onClick={handleLoadBlueprint}
                                                className="gradient-btn rounded-lg px-4 py-2 text-sm font-medium text-foreground"
                                            >
                                                Load Example Circuit
                                            </button>
                                        )}
                                        {blueprintLoaded && (
                                            <button
                                                onClick={handleClearCircuit}
                                                className="rounded-lg bg-surface-tertiary px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
                                            >
                                                Clear Circuit
                                            </button>
                                        )}
                                        <Link
                                            href="/playground"
                                            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
                                        >
                                            Open Full Playground
                                        </Link>
                                    </div>
                                </div>

                                {/* Blueprint errors */}
                                {blueprintErrors.length > 0 && (
                                    <div className="border-warning/30 bg-warning/10 mb-4 rounded-xl border p-3">
                                        <p className="mb-1 text-sm font-medium text-warning">
                                            ⚠️ Some wires could not be connected:
                                        </p>
                                        <ul className="list-inside list-disc text-sm text-warning">
                                            {blueprintErrors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Blueprint loaded indicator */}
                                {blueprintLoaded && blueprintErrors.length === 0 && (
                                    <div className="border-success/30 bg-success/10 mb-4 rounded-xl border p-3">
                                        <p className="text-sm text-success">
                                            ✓ Example circuit loaded! Click the Play button to run
                                            the simulation.
                                        </p>
                                    </div>
                                )}

                                {/* Embedded Playground with Component Palette */}
                                <EmbeddedPlayground height={500} />

                                {/* No blueprint available message */}
                                {!practical.circuitBlueprint && (
                                    <p className="mt-3 text-sm text-text-muted">
                                        💡 No pre-built circuit available for this level. Build your
                                        own following the steps above!
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* No content yet */}
                    {!theory && !practical && (
                        <div className="glass-card rounded-2xl p-8 text-center">
                            <p className="text-text-muted">
                                Content for this level is not available yet.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
