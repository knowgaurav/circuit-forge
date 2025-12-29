'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import type { CoursePlan, CourseEnrollment } from '@/types';

const difficultyColors: Record<string, string> = {
    'Beginner': 'text-green-600 bg-green-100',
    'Intermediate': 'text-yellow-600 bg-yellow-100',
    'Advanced': 'text-red-600 bg-red-100',
};

export default function CoursePage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.courseId as string;

    const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
    const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCourse();
    }, [courseId]);

    const loadCourse = async () => {
        try {
            const plan = await api.getCoursePlan(courseId);
            setCoursePlan(plan);

            // Check if user is enrolled (using localStorage participantId)
            const participantId = localStorage.getItem('participantId');
            if (participantId) {
                try {
                    const courses = await api.getMyCourses(participantId);
                    const enrolled = courses.find(c => c.coursePlan.id === courseId);
                    if (enrolled) {
                        setEnrollment(enrolled.enrollment);
                    }
                } catch {
                    // Not enrolled yet, that's fine
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load course');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartCourse = async () => {
        if (!coursePlan) return;

        // Get or create participant ID
        let participantId = localStorage.getItem('participantId');
        if (!participantId) {
            participantId = crypto.randomUUID();
            localStorage.setItem('participantId', participantId);
        }

        try {
            const { enrollment: newEnrollment } = await api.enrollInCourse(courseId, participantId);
            setEnrollment(newEnrollment);
            // Navigate to first level
            router.push(`/courses/${courseId}/level/1`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to enroll in course');
        }
    };

    const handleContinueCourse = () => {
        if (!enrollment) return;
        router.push(`/courses/${courseId}/level/${enrollment.currentLevel}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading course...</p>
                </div>
            </div>
        );
    }

    if (error || !coursePlan) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || 'Course not found'}</p>
                    <Link href="/courses/create" className="text-blue-600 hover:underline">
                        Create a new course
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {coursePlan.title}
                            </h1>
                            <p className="text-gray-600">{coursePlan.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyColors[coursePlan.difficulty]}`}>
                            {coursePlan.difficulty}
                        </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-6">
                        <span>📚 {coursePlan.levels.length} levels</span>
                        <span>⏱️ ~{coursePlan.estimatedHours} hours</span>
                        <span>🎯 Topic: {coursePlan.topic}</span>
                    </div>

                    {enrollment ? (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleContinueCourse}
                                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Continue Course (Level {enrollment.currentLevel})
                            </button>
                            <span className="text-sm text-gray-500">
                                Started {new Date(enrollment.startedAt).toLocaleDateString()}
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={handleStartCourse}
                            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Start Course
                        </button>
                    )}
                </div>

                {/* Course Outline */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Course Outline</h2>
                    <div className="space-y-3">
                        {coursePlan.levels.map((level, index) => {
                            const isUnlocked = enrollment ? level.levelNumber <= enrollment.currentLevel : index === 0;
                            const isCurrent = enrollment?.currentLevel === level.levelNumber;
                            const isCompleted = enrollment ? level.levelNumber < enrollment.currentLevel : false;

                            return (
                                <div
                                    key={level.levelNumber}
                                    className={`p-4 rounded-lg border-2 transition-all ${isCurrent
                                            ? 'border-blue-500 bg-blue-50'
                                            : isCompleted
                                                ? 'border-green-300 bg-green-50'
                                                : isUnlocked
                                                    ? 'border-gray-200 bg-white hover:border-gray-300'
                                                    : 'border-gray-200 bg-gray-50 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isCompleted
                                                    ? 'bg-green-500 text-white'
                                                    : isCurrent
                                                        ? 'bg-blue-500 text-white'
                                                        : isUnlocked
                                                            ? 'bg-gray-300 text-gray-600'
                                                            : 'bg-gray-200 text-gray-400'
                                                }`}
                                        >
                                            {isCompleted ? '✓' : level.levelNumber}
                                        </span>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{level.title}</h3>
                                            <p className="text-sm text-gray-500">{level.description}</p>
                                        </div>
                                        {isCurrent && (
                                            <Link
                                                href={`/courses/${courseId}/level/${level.levelNumber}`}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                            >
                                                Continue
                                            </Link>
                                        )}
                                        {isCompleted && (
                                            <Link
                                                href={`/courses/${courseId}/level/${level.levelNumber}`}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                            >
                                                Review
                                            </Link>
                                        )}
                                        {!isUnlocked && (
                                            <span className="text-gray-400 text-lg">🔒</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Back Link */}
                <div className="mt-6 text-center">
                    <Link href="/courses/create" className="text-blue-600 hover:underline">
                        ← Create another course
                    </Link>
                </div>
            </div>
        </div>
    );
}
