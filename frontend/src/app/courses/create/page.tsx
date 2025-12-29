'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { Zap, ArrowLeft, Sparkles } from 'lucide-react';
import type { TopicSuggestion, CoursePlan } from '@/types';

// Category colors for visual distinction (dark theme)
const categoryColors: Record<string, string> = {
    'Digital Logic': 'bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30',
    'Computing': 'bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30',
    'Robotics': 'bg-green-500/20 border-green-500/50 hover:bg-green-500/30',
    'Automation': 'bg-orange-500/20 border-orange-500/50 hover:bg-orange-500/30',
};

const difficultyColors: Record<string, string> = {
    'Beginner': 'text-green-400 bg-green-500/20',
    'Intermediate': 'text-yellow-400 bg-yellow-500/20',
    'Advanced': 'text-red-400 bg-red-500/20',
};

export default function CreateCoursePage() {
    const router = useRouter();
    const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
    const [customTopic, setCustomTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedPlan, setGeneratedPlan] = useState<CoursePlan | null>(null);

    useEffect(() => {
        loadSuggestions();
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
        setIsLoading(true);
        setError(null);
        try {
            const { coursePlan } = await api.generateCoursePlan(topic);
            setGeneratedPlan(coursePlan);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate course plan';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
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
            <div className="min-h-screen bg-[#0a0a0f]">
                {/* Navigation */}
                <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-xl text-white">CircuitForge</span>
                            </Link>
                        </div>
                    </div>
                </nav>

                <div className="pt-24 pb-12 px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="glass-card p-8 rounded-2xl">
                            <h1 className="text-2xl font-bold text-white mb-2">
                                {generatedPlan.title}
                            </h1>
                            <p className="text-gray-400 mb-4">{generatedPlan.description}</p>

                            <div className="flex gap-4 mb-6">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyColors[generatedPlan.difficulty]}`}>
                                    {generatedPlan.difficulty}
                                </span>
                                <span className="text-gray-500">
                                    {generatedPlan.levels.length} levels • ~{generatedPlan.estimatedHours} hours
                                </span>
                            </div>

                            <h2 className="text-lg font-semibold text-white mb-4">Course Outline</h2>
                            <div className="space-y-3 mb-6">
                                {generatedPlan.levels.map((level, index) => (
                                    <div
                                        key={level.levelNumber}
                                        className={`p-4 rounded-lg border ${index === 0 ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 bg-white/5'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index === 0 ? 'bg-green-500 text-white' : 'bg-white/20 text-gray-400'}`}>
                                                {level.levelNumber}
                                            </span>
                                            <div className="flex-1">
                                                <h3 className="font-medium text-white">{level.title}</h3>
                                                <p className="text-sm text-gray-500">{level.description}</p>
                                            </div>
                                            {index === 0 && (
                                                <span className="text-green-400 text-sm font-medium">
                                                    Unlocked
                                                </span>
                                            )}
                                            {index > 0 && (
                                                <span className="text-gray-500">
                                                    🔒
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleStartCourse}
                                    className="flex-1 gradient-btn py-3 px-6 rounded-xl text-white font-medium"
                                >
                                    Start Course
                                </button>
                                <button
                                    onClick={handleRegeneratePlan}
                                    className="px-6 py-3 border border-white/20 rounded-xl font-medium text-gray-300 hover:bg-white/5 transition-colors"
                                >
                                    Regenerate
                                </button>
                                <button
                                    onClick={() => setGeneratedPlan(null)}
                                    className="px-6 py-3 border border-white/20 rounded-xl font-medium text-gray-300 hover:bg-white/5 transition-colors"
                                >
                                    Change Topic
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-xl text-white">CircuitForge</span>
                        </Link>
                        <Link href="/" className="text-gray-400 hover:text-white text-sm font-medium flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="pt-24 pb-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-sm font-medium mb-4 text-purple-300">
                            <Sparkles className="w-4 h-4" />
                            AI-Powered Learning
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Create Your Circuit Course
                        </h1>
                        <p className="text-gray-400">
                            Choose a topic or enter your own to generate a personalized learning path
                        </p>
                    </div>

                    {/* Custom Topic Input */}
                    <div className="glass-card p-6 rounded-2xl mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4">Enter Your Own Topic</h2>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={customTopic}
                                onChange={(e) => setCustomTopic(e.target.value)}
                                placeholder="e.g., 4-bit calculator, digital clock, traffic light controller..."
                                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handleGeneratePlan(customTopic)}
                                disabled={!customTopic.trim() || isLoading}
                                className="px-6 py-3 gradient-btn rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Generating...' : 'Generate Course'}
                            </button>
                        </div>
                        {error && (
                            <p className="mt-2 text-red-400 text-sm">{error}</p>
                        )}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="glass-card p-8 rounded-2xl mb-8 text-center">
                            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-300">Generating your personalized course plan...</p>
                            <p className="text-sm text-gray-500 mt-2">This may take up to 30 seconds</p>
                        </div>
                    )}

                    {/* Suggested Topics */}
                    {!isLoading && (
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Or Choose a Suggested Topic</h2>
                            {Object.entries(groupedSuggestions).map(([category, items]) => (
                                <div key={category} className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-300 mb-3">{category}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {items.map((suggestion) => (
                                            <button
                                                key={suggestion.topic}
                                                onClick={() => handleGeneratePlan(suggestion.topic)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${categoryColors[category] || 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            >
                                                <h4 className="font-semibold text-white mb-1">
                                                    {suggestion.title}
                                                </h4>
                                                <p className="text-sm text-gray-400 mb-2">
                                                    {suggestion.description}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[suggestion.difficulty]}`}>
                                                        {suggestion.difficulty}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        ~{suggestion.estimatedLevels} levels
                                                    </span>
                                                </div>
                                            </button>
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
