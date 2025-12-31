'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { Zap, ArrowLeft } from 'lucide-react';
import type { CoursePlan, CourseEnrollment } from '@/types';

const difficultyColors: Record<string, string> = {
    'Beginner': 'text-green-400 bg-green-500/20',
    'Intermediate': 'text-yellow-400 bg-yellow-500/20',
    'Advanced': 'text-red-400 bg-red-500/20',
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

            const participantId = localStorage.getItem('participantId');
            if (participantId) {
                try {
                    const courses = await api.getMyCourses(participantId);
                    const enrolled = courses.find(c => c.coursePlan.id === courseId);
                    if (enrolled) {
                        setEnrollment(enrolled.enrollment);
                    }
                } catch {
                    // Not enrolled yet
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

        let participantId = localStorage.getItem('participantId');
        if (!participantId) {
            participantId = crypto.randomUUID();
            localStorage.setItem('participantId', participantId);
        }

        try {
            const { enrollment: newEnrollment } = await api.enrollInCourse(courseId, participantId);
            setEnrollment(newEnrollment);
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
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading course...</p>
                </div>
            </div>
        );
    }

    if (error || !coursePlan) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error || 'Course not found'}</p>
                    <Link href="/courses/create" className="text-purple-400 hover:text-purple-300">
                        Create a new course
                    </Link>
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
                        <Link href="/courses/create" className="text-gray-400 hover:text-white text-sm font-medium flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Courses
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="pt-24 pb-12 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="glass-card p-8 rounded-2xl mb-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-2">
                                    {coursePlan.title}
                                </h1>
                                <p className="text-gray-400">{coursePlan.description}</p>
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
                                    className="flex-1 gradient-btn py-3 px-6 rounded-xl text-white font-medium"
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
                                className="w-full gradient-btn py-3 px-6 rounded-xl text-white font-medium"
                            >
                                Start Course
                            </button>
                        )}
                    </div>

                    {/* Course Outline */}
                    <div className="glass-card p-8 rounded-2xl">
                        <h2 className="text-lg font-semibold text-white mb-4">Course Outline</h2>
                        <div className="space-y-3">
                            {coursePlan.levels.map((level, index) => {
                                const isUnlocked = enrollment ? level.levelNumber <= enrollment.currentLevel : index === 0;
                                const isCurrent = enrollment?.currentLevel === level.levelNumber;
                                const isCompleted = enrollment ? level.levelNumber < enrollment.currentLevel : false;

                                return (
                                    <div
                                        key={level.levelNumber}
                                        className={`p-4 rounded-xl border transition-all ${isCurrent
                                            ? 'border-blue-500/50 bg-blue-500/10'
                                            : isCompleted
                                                ? 'border-green-500/50 bg-green-500/10'
                                                : isUnlocked
                                                    ? 'border-white/10 bg-white/5 hover:border-white/20'
                                                    : 'border-white/5 bg-white/[0.02] opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isCompleted
                                                    ? 'bg-green-500 text-white'
                                                    : isCurrent
                                                        ? 'bg-blue-500 text-white'
                                                        : isUnlocked
                                                            ? 'bg-white/20 text-gray-300'
                                                            : 'bg-white/10 text-gray-500'
                                                    }`}
                                            >
                                                {isCompleted ? '✓' : level.levelNumber}
                                            </span>
                                            <div className="flex-1">
                                                <h3 className="font-medium text-white">{level.title}</h3>
                                                <p className="text-sm text-gray-500">{level.description}</p>
                                            </div>
                                            {isCurrent && (
                                                <Link
                                                    href={`/courses/${courseId}/level/${level.levelNumber}`}
                                                    className="px-4 py-2 gradient-btn rounded-lg text-sm font-medium text-white"
                                                >
                                                    Continue
                                                </Link>
                                            )}
                                            {isCompleted && (
                                                <Link
                                                    href={`/courses/${courseId}/level/${level.levelNumber}`}
                                                    className="px-4 py-2 border border-white/20 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
                                                >
                                                    Review
                                                </Link>
                                            )}
                                            {!isUnlocked && (
                                                <span className="text-gray-500">🔒</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Back Link */}
                    <div className="mt-6 text-center">
                        <Link href="/courses/create" className="text-purple-400 hover:text-purple-300">
                            ← Create another course
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
