'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import type { CoursePlan, LevelContent, LevelOutline } from '@/types';

export default function LevelPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.courseId as string;
    const levelNum = parseInt(params.levelNum as string, 10);

    const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
    const [levelContent, setLevelContent] = useState<LevelContent | null>(null);
    const [levelOutline, setLevelOutline] = useState<LevelOutline | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'theory' | 'practical'>('theory');

    useEffect(() => {
        loadLevel();
    }, [courseId, levelNum]);

    const loadLevel = async () => {
        setIsLoading(true);
        try {
            // Load course plan
            const plan = await api.getCoursePlan(courseId);
            setCoursePlan(plan);

            // Find level outline
            const outline = plan.levels.find(l => l.levelNumber === levelNum);
            setLevelOutline(outline || null);

            // Load level content
            const { content, isGenerating: generating } = await api.getLevelContent(courseId, levelNum);
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
        const interval = setInterval(async () => {
            try {
                const { content, isGenerating: generating } = await api.getLevelContent(courseId, levelNum);
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading level...</p>
                </div>
            </div>
        );
    }

    if (isGenerating) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Generating Your Personalized Content
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Our AI is creating custom learning materials for this level. This usually takes 15-30 seconds.
                    </p>
                    <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                        💡 Tip: While you wait, you can review previous levels or explore the course outline.
                    </div>
                </div>
            </div>
        );
    }

    if (error || !coursePlan || !levelOutline) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || 'Level not found'}</p>
                    <Link href={`/courses/${courseId}`} className="text-blue-600 hover:underline">
                        Back to course
                    </Link>
                </div>
            </div>
        );
    }

    const theory = levelContent?.theory;
    const practical = levelContent?.practical;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href={`/courses/${courseId}`}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ← Back
                            </Link>
                            <div>
                                <p className="text-sm text-gray-500">
                                    Level {levelNum} of {coursePlan.levels.length}
                                </p>
                                <h1 className="text-lg font-semibold text-gray-900">
                                    {levelOutline.title}
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {levelNum > 1 && (
                                <Link
                                    href={`/courses/${courseId}/level/${levelNum - 1}`}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Previous
                                </Link>
                            )}
                            <button
                                onClick={handleCompleteLevel}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                            >
                                Complete Level
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('theory')}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'theory'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        📖 Theory
                    </button>
                    <button
                        onClick={() => setActiveTab('practical')}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'practical'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        🔧 Practical
                    </button>
                </div>

                {/* Theory Tab */}
                {activeTab === 'theory' && theory && (
                    <div className="space-y-6">
                        {/* Learning Objectives */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold mb-4">🎯 Learning Objectives</h2>
                            <ul className="space-y-2">
                                {theory.objectives.map((obj, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-green-500 mt-1">✓</span>
                                        <span>{obj}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Concept Explanation */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold mb-4">📚 Concept Explanation</h2>
                            <div className="prose max-w-none">
                                <p className="text-gray-700 whitespace-pre-wrap">
                                    {theory.conceptExplanation}
                                </p>
                            </div>
                        </div>

                        {/* Real World Examples */}
                        {theory.realWorldExamples.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold mb-4">🌍 Real World Examples</h2>
                                <ul className="space-y-3">
                                    {theory.realWorldExamples.map((example, i) => (
                                        <li key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                            <span className="text-blue-500">💡</span>
                                            <span className="text-gray-700">{example}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Key Terms */}
                        {theory.keyTerms.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold mb-4">📝 Key Terms</h2>
                                <div className="grid gap-3">
                                    {theory.keyTerms.map((term, i) => (
                                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                                            <span className="font-medium text-gray-900">{term.term}:</span>{' '}
                                            <span className="text-gray-600">{term.definition}</span>
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
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold mb-4">🧩 Components Needed</h2>
                            <div className="flex flex-wrap gap-2">
                                {practical.componentsNeeded.map((comp, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium"
                                    >
                                        {comp.type} × {comp.count}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Build Steps */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold mb-4">📋 Build Steps</h2>
                            <div className="space-y-4">
                                {practical.steps.map((step) => (
                                    <div key={step.stepNumber} className="flex gap-4">
                                        <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium flex-shrink-0">
                                            {step.stepNumber}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-gray-700">{step.instruction}</p>
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
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold mb-4">✅ Expected Behavior</h2>
                            <p className="text-gray-700">{practical.expectedBehavior}</p>
                        </div>

                        {/* Common Mistakes */}
                        {practical.commonMistakes.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold mb-4">⚠️ Common Mistakes to Avoid</h2>
                                <ul className="space-y-2">
                                    {practical.commonMistakes.map((mistake, i) => (
                                        <li key={i} className="flex items-start gap-2 text-gray-700">
                                            <span className="text-red-500">✗</span>
                                            <span>{mistake}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Circuit Canvas Placeholder */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold mb-4">🔌 Build Your Circuit</h2>
                            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <p className="text-lg mb-2">Circuit Canvas</p>
                                    <p className="text-sm">
                                        Integration with CircuitForge canvas coming soon!
                                    </p>
                                    <Link
                                        href="/playground"
                                        className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                                    >
                                        Open Playground
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* No content yet */}
                {!theory && !practical && (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-500">
                            Content for this level is not available yet.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
