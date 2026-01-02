'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { loadCircuitFromBlueprint, validateBlueprint } from '@/services/blueprintLoader';
import { EmbeddedPlayground } from '@/components/circuit';
import { useCircuitStore } from '@/stores/circuitStore';
import { useLLMConfigStore } from '@/stores/llmConfigStore';
import { APIKeyModal } from '@/components/ui/APIKeyModal';
import { Navbar } from '@/components/ui/Navbar';
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
            const outline = plan.levels.find(l => l.levelNumber === levelNum);
            setLevelOutline(outline || null);

            // Load level content with LLM config
            const { content, isGenerating: generating } = await api.getLevelContent(courseId, levelNum, config);
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
                const { content, isGenerating: generating } = await api.getLevelContent(courseId, levelNum, config);
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
        const { components, wires, errors, warnings } = loadCircuitFromBlueprint(practical.circuitBlueprint);

        // Only show actual errors, not warnings (warnings are for skipped wires)
        if (errors.length > 0) {
            setBlueprintErrors(errors);
        } else if (warnings.length > 0) {
            // Show warnings but still load the circuit
            setBlueprintErrors(warnings.map(w => `⚠️ ${w}`));
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
            const enrolled = courses.find(c => c.coursePlan.id === courseId);
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
            <div className="min-h-screen bg-background transition-colors duration-300 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 spinner-brand rounded-full mx-auto mb-4"></div>
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
            <div className="min-h-screen bg-background transition-colors duration-300 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="animate-spin w-16 h-16 border-4 spinner-brand rounded-full mx-auto mb-6"></div>
                    <h2 className="text-xl font-semibold text-text mb-2">
                        Generating Your Personalized Content
                    </h2>
                    <p className="text-text-secondary mb-4">
                        Our AI is creating custom learning materials for this level. This usually takes 15-30 seconds.
                    </p>
                    <div className="glass-card rounded-xl p-4 text-sm text-brand-muted">
                        Tip: While you wait, you can review previous levels or explore the course outline.
                    </div>
                </div>
            </div>
        );
    }

    if (error || !coursePlan || !levelOutline) {
        return (
            <div className="min-h-screen bg-background transition-colors duration-300 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error || 'Level not found'}</p>
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
            <div className="pt-24 pb-12 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Level Header */}
                    <div className="flex items-center justify-between mb-6">
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
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                            Complete Level
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('theory')}
                            className={`px-6 py-3 rounded-xl font-medium transition-colors ${activeTab === 'theory'
                                ? 'gradient-btn text-white'
                                : 'glass-card text-gray-300 hover:text-white'
                                }`}
                        >
                            📖 Theory
                        </button>
                        <button
                            onClick={() => setActiveTab('practical')}
                            className={`px-6 py-3 rounded-xl font-medium transition-colors ${activeTab === 'practical'
                                ? 'gradient-btn text-white'
                                : 'glass-card text-gray-300 hover:text-white'
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
                                <h2 className="text-lg font-semibold text-white mb-4">🎯 Learning Objectives</h2>
                                <ul className="space-y-2">
                                    {theory.objectives.map((obj, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-green-400 mt-1">✓</span>
                                            <span className="text-gray-300">{obj}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Concept Explanation */}
                            <div className="glass-card rounded-2xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">📚 Concept Explanation</h2>
                                <div className="prose max-w-none">
                                    <p className="text-gray-300 whitespace-pre-wrap">
                                        {theory.conceptExplanation}
                                    </p>
                                </div>
                            </div>

                            {/* Real World Examples */}
                            {theory.realWorldExamples.length > 0 && (
                                <div className="glass-card rounded-2xl p-6">
                                    <h2 className="text-lg font-semibold text-white mb-4">🌍 Real World Examples</h2>
                                    <ul className="space-y-3">
                                        {theory.realWorldExamples.map((example, i) => (
                                            <li key={i} className="flex items-start gap-3 p-3 bg-brand-subtle border border-brand-subtle rounded-xl">
                                                <span className="text-brand-link">💡</span>
                                                <span className="text-gray-300">{example}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Key Terms */}
                            {theory.keyTerms.length > 0 && (
                                <div className="glass-card rounded-2xl p-6">
                                    <h2 className="text-lg font-semibold text-white mb-4">📝 Key Terms</h2>
                                    <div className="grid gap-3">
                                        {theory.keyTerms.map((term, i) => (
                                            <div key={i} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                                <span className="font-medium text-white">{term.term}:</span>{' '}
                                                <span className="text-gray-400">{term.definition}</span>
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
                                <h2 className="text-lg font-semibold text-white mb-4">🧩 Components Needed</h2>
                                <div className="flex flex-wrap gap-2">
                                    {practical.componentsNeeded.map((comp, i) => (
                                        <span
                                            key={i}
                                            className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-gray-300"
                                        >
                                            {comp.type} × {comp.count}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Build Steps */}
                            <div className="glass-card rounded-2xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">📋 Build Steps</h2>
                                <div className="space-y-4">
                                    {practical.steps.map((step) => (
                                        <div key={step.stepNumber} className="flex gap-4">
                                            <span className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center font-medium flex-shrink-0">
                                                {step.stepNumber}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-gray-300">{step.instruction}</p>
                                                {step.hint && (
                                                    <p className="text-sm text-gray-500 mt-1">
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
                                <h2 className="text-lg font-semibold text-white mb-4">✅ Expected Behavior</h2>
                                <p className="text-gray-300">{practical.expectedBehavior}</p>
                            </div>

                            {/* Common Mistakes */}
                            {practical.commonMistakes.length > 0 && (
                                <div className="glass-card rounded-2xl p-6">
                                    <h2 className="text-lg font-semibold text-white mb-4">⚠️ Common Mistakes to Avoid</h2>
                                    <ul className="space-y-2">
                                        {practical.commonMistakes.map((mistake, i) => (
                                            <li key={i} className="flex items-start gap-2 text-gray-300">
                                                <span className="text-red-400">✗</span>
                                                <span>{mistake}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Circuit Canvas */}
                            <div className="glass-card rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-white">🔌 Build Your Circuit</h2>
                                    <div className="flex gap-2 items-center">
                                        {practical.circuitBlueprint && !blueprintLoaded && (
                                            <button
                                                onClick={handleLoadBlueprint}
                                                className="px-4 py-2 gradient-btn rounded-lg text-sm font-medium text-white"
                                            >
                                                Load Example Circuit
                                            </button>
                                        )}
                                        {blueprintLoaded && (
                                            <button
                                                onClick={handleClearCircuit}
                                                className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/20"
                                            >
                                                Clear Circuit
                                            </button>
                                        )}
                                        <Link
                                            href="/playground"
                                            className="px-4 py-2 border border-white/20 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/5"
                                        >
                                            Open Full Playground
                                        </Link>
                                    </div>
                                </div>

                                {/* Blueprint errors */}
                                {blueprintErrors.length > 0 && (
                                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                        <p className="text-sm font-medium text-yellow-400 mb-1">⚠️ Some wires could not be connected:</p>
                                        <ul className="text-sm text-yellow-300 list-disc list-inside">
                                            {blueprintErrors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Blueprint loaded indicator */}
                                {blueprintLoaded && blueprintErrors.length === 0 && (
                                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                                        <p className="text-sm text-green-400">
                                            ✓ Example circuit loaded! Click the Play button to run the simulation.
                                        </p>
                                    </div>
                                )}

                                {/* Embedded Playground with Component Palette */}
                                <EmbeddedPlayground height={500} />

                                {/* No blueprint available message */}
                                {!practical.circuitBlueprint && (
                                    <p className="mt-3 text-sm text-gray-500">
                                        💡 No pre-built circuit available for this level. Build your own following the steps above!
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* No content yet */}
                    {!theory && !practical && (
                        <div className="glass-card rounded-2xl p-8 text-center">
                            <p className="text-gray-400">
                                Content for this level is not available yet.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
