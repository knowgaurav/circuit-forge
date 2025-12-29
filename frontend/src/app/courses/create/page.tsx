'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import type { TopicSuggestion, CoursePlan } from '@/types';

// Category colors for visual distinction
const categoryColors: Record<string, string> = {
    'Digital Logic': 'bg-blue-100 border-blue-300 hover:bg-blue-200',
    'Computing': 'bg-purple-100 border-purple-300 hover:bg-purple-200',
    'Robotics': 'bg-green-100 border-green-300 hover:bg-green-200',
    'Automation': 'bg-orange-100 border-orange-300 hover:bg-orange-200',
};

const difficultyColors: Record<string, string> = {
    'Beginner': 'text-green-600 bg-green-100',
    'Intermediate': 'text-yellow-600 bg-yellow-100',
    'Advanced': 'text-red-600 bg-red-100',
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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate course plan');
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
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {generatedPlan.title}
                        </h1>
                        <p className="text-gray-600 mb-4">{generatedPlan.description}</p>

                        <div className="flex gap-4 mb-6">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyColors[generatedPlan.difficulty]}`}>
                                {generatedPlan.difficulty}
                            </span>
                            <span className="text-gray-500">
                                {generatedPlan.levels.length} levels • ~{generatedPlan.estimatedHours} hours
                            </span>
                        </div>

                        <h2 className="text-lg font-semibold mb-4">Course Outline</h2>
                        <div className="space-y-3 mb-6">
                            {generatedPlan.levels.map((level, index) => (
                                <div
                                    key={level.levelNumber}
                                    className={`p-4 rounded-lg border ${index === 0 ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index === 0 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                            {level.levelNumber}
                                        </span>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{level.title}</h3>
                                            <p className="text-sm text-gray-500">{level.description}</p>
                                        </div>
                                        {index === 0 && (
                                            <span className="ml-auto text-green-600 text-sm font-medium">
                                                Unlocked
                                            </span>
                                        )}
                                        {index > 0 && (
                                            <span className="ml-auto text-gray-400">
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
                                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Start Course
                            </button>
                            <button
                                onClick={handleRegeneratePlan}
                                className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Regenerate Plan
                            </button>
                            <button
                                onClick={() => setGeneratedPlan(null)}
                                className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Change Topic
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Create Your Circuit Course
                    </h1>
                    <p className="text-gray-600">
                        Choose a topic or enter your own to generate a personalized learning path
                    </p>
                </div>

                {/* Custom Topic Input */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-lg font-semibold mb-4">Enter Your Own Topic</h2>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder="e.g., 4-bit calculator, digital clock, traffic light controller..."
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleGeneratePlan(customTopic)}
                            disabled={!customTopic.trim() || isLoading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Generating...' : 'Generate Course'}
                        </button>
                    </div>
                    {error && (
                        <p className="mt-2 text-red-600 text-sm">{error}</p>
                    )}
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">Generating your personalized course plan...</p>
                        <p className="text-sm text-gray-400 mt-2">This may take up to 30 seconds</p>
                    </div>
                )}

                {/* Suggested Topics */}
                {!isLoading && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Or Choose a Suggested Topic</h2>
                        {Object.entries(groupedSuggestions).map(([category, items]) => (
                            <div key={category} className="mb-6">
                                <h3 className="text-lg font-medium text-gray-700 mb-3">{category}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {items.map((suggestion) => (
                                        <button
                                            key={suggestion.topic}
                                            onClick={() => handleGeneratePlan(suggestion.topic)}
                                            className={`p-4 rounded-lg border-2 text-left transition-all ${categoryColors[category] || 'bg-gray-100 border-gray-300 hover:bg-gray-200'}`}
                                        >
                                            <h4 className="font-semibold text-gray-900 mb-1">
                                                {suggestion.title}
                                            </h4>
                                            <p className="text-sm text-gray-600 mb-2">
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
    );
}
