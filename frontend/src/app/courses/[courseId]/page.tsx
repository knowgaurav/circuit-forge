'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

import { Navbar } from '@/components/ui/Navbar';

import { api } from '@/services/api';

import type { CoursePlan, CourseEnrollment } from '@/types';

const difficultyColors: Record<string, string> = {
    Beginner: 'text-success bg-success/15',
    Intermediate: 'text-warning bg-warning/15',
    Advanced: 'text-error bg-error/15',
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
                    const enrolled = courses.find((c) => c.coursePlan.id === courseId);
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
            <div className="flex min-h-screen items-center justify-center bg-background transition-colors duration-300">
                <div className="text-center">
                    <div className="spinner-brand mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4"></div>
                    <p className="text-text-secondary">Loading course...</p>
                </div>
            </div>
        );
    }

    if (error || !coursePlan) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background transition-colors duration-300">
                <div className="text-center">
                    <p className="mb-4 text-error">{error || 'Course not found'}</p>
                    <Link href="/courses/create" className="text-brand-link">
                        Create a new course
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />

            <div className="px-4 pb-12 pt-24">
                <div className="mx-auto max-w-4xl">
                    {/* Header */}
                    <div className="glass-card mb-6 rounded-2xl p-8">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h1 className="mb-2 font-heading text-2xl font-bold text-foreground">
                                    {coursePlan.title}
                                </h1>
                                <p className="text-text-secondary">{coursePlan.description}</p>
                            </div>
                            <span
                                className={`rounded-full px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider ${difficultyColors[coursePlan.difficulty]}`}
                            >
                                {coursePlan.difficulty}
                            </span>
                        </div>

                        <div className="mb-6 flex items-center gap-6 font-mono text-sm text-text-muted">
                            <span>📚 {coursePlan.levels.length} levels</span>
                            <span>⏱️ ~{coursePlan.estimatedHours} hours</span>
                            <span>🎯 Topic: {coursePlan.topic}</span>
                        </div>

                        {enrollment ? (
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleContinueCourse}
                                    className="gradient-btn flex-1 rounded-xl px-6 py-3 font-medium"
                                >
                                    Continue Course (Level {enrollment.currentLevel})
                                </button>
                                <span className="text-sm text-text-muted">
                                    Started {new Date(enrollment.startedAt).toLocaleDateString()}
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={handleStartCourse}
                                className="gradient-btn w-full rounded-xl px-6 py-3 font-medium"
                            >
                                Start Course
                            </button>
                        )}
                    </div>

                    {/* Course Outline */}
                    <div className="glass-card rounded-2xl p-8">
                        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
                            Course Outline
                        </h2>
                        <div className="space-y-3">
                            {coursePlan.levels.map((level, index) => {
                                const isUnlocked = enrollment
                                    ? level.levelNumber <= enrollment.currentLevel
                                    : index === 0;
                                const isCurrent = enrollment?.currentLevel === level.levelNumber;
                                const isCompleted = enrollment
                                    ? level.levelNumber < enrollment.currentLevel
                                    : false;

                                return (
                                    <div
                                        key={level.levelNumber}
                                        className={`rounded-xl border p-4 transition-all ${
                                            isCurrent
                                                ? 'border-primary/50 bg-primary/10'
                                                : isCompleted
                                                  ? 'border-success/50 bg-success/10'
                                                  : isUnlocked
                                                    ? 'border-border bg-surface-secondary hover:border-border-strong'
                                                    : 'bg-surface-secondary/50 border-border-subtle opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-medium ${
                                                    isCompleted
                                                        ? 'bg-success text-success-foreground'
                                                        : isCurrent
                                                          ? 'bg-primary text-primary-foreground'
                                                          : isUnlocked
                                                            ? 'bg-surface-tertiary text-text-secondary'
                                                            : 'bg-surface-tertiary text-text-muted'
                                                }`}
                                            >
                                                {isCompleted ? '✓' : level.levelNumber}
                                            </span>
                                            <div className="flex-1">
                                                <h3 className="font-medium text-foreground">
                                                    {level.title}
                                                </h3>
                                                <p className="text-sm text-text-muted">
                                                    {level.description}
                                                </p>
                                            </div>
                                            {isCurrent && (
                                                <Link
                                                    href={`/courses/${courseId}/level/${level.levelNumber}`}
                                                    className="gradient-btn rounded-lg px-4 py-2 text-sm font-medium"
                                                >
                                                    Continue
                                                </Link>
                                            )}
                                            {isCompleted && (
                                                <Link
                                                    href={`/courses/${courseId}/level/${level.levelNumber}`}
                                                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
                                                >
                                                    Review
                                                </Link>
                                            )}
                                            {!isUnlocked && (
                                                <span className="text-text-muted">🔒</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Back Link */}
                    <div className="mt-6 text-center">
                        <Link href="/courses/create" className="text-brand-link">
                            ← Create another course
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
