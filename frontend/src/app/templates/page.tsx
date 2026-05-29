'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { BookOpen, Wrench, ChevronRight, Sparkles, Zap, ArrowLeft } from 'lucide-react';

import { Navbar } from '@/components/ui/Navbar';

import { Button, Badge, Panel } from '@/components/ui';

import {
    TEMPLATES,
    TEMPLATE_CATEGORIES,
    getTemplatesByCategory,
    type Template,
    type TemplateCategory,
} from '@/constants/templates';

export default function TemplatesPage() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

    const filteredTemplates =
        selectedCategory === 'all' ? TEMPLATES : getTemplatesByCategory(selectedCategory);

    const handleStartLearning = (template: Template) => {
        router.push(`/templates/${template.id}?mode=learning`);
    };

    const handleStartImplementation = (template: Template) => {
        router.push(`/templates/${template.id}?mode=implementation`);
    };

    const handleOpenPlayground = () => {
        router.push('/playground');
    };

    const getDifficultyColor = (difficulty: Template['difficulty']) => {
        switch (difficulty) {
            case 'beginner':
                return 'success';
            case 'intermediate':
                return 'warning';
            case 'advanced':
                return 'danger';
            default:
                return 'default';
        }
    };

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />

            <div className="mx-auto max-w-7xl px-6 py-8 pt-24">
                <div className="flex gap-8">
                    {/* Sidebar - Categories */}
                    <div className="w-64 flex-shrink-0">
                        <Panel title="Categories">
                            <div className="space-y-1">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                        selectedCategory === 'all'
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    All Templates
                                </button>
                                {(
                                    Object.entries(TEMPLATE_CATEGORIES) as [
                                        TemplateCategory,
                                        (typeof TEMPLATE_CATEGORIES)[TemplateCategory],
                                    ][]
                                ).map(([key, category]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedCategory(key)}
                                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                            selectedCategory === key
                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <span className="mr-2">{category.icon}</span>
                                        {category.name}
                                        <span className="ml-2 text-gray-400">
                                            ({getTemplatesByCategory(key).length})
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </Panel>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {selectedTemplate ? (
                            /* Template Detail View */
                            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                                <button
                                    onClick={() => setSelectedTemplate(null)}
                                    className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to templates
                                </button>

                                <div className="mb-6 flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                            {selectedTemplate.name}
                                        </h2>
                                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                                            {selectedTemplate.description}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <Badge
                                                variant={getDifficultyColor(
                                                    selectedTemplate.difficulty
                                                )}
                                            >
                                                {selectedTemplate.difficulty}
                                            </Badge>
                                            <Badge variant="default">
                                                {
                                                    TEMPLATE_CATEGORIES[selectedTemplate.category]
                                                        .name
                                                }
                                            </Badge>
                                            <Badge variant="default">
                                                {selectedTemplate.steps.length} steps
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Overview */}
                                <div className="mb-6">
                                    <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
                                        Overview
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {selectedTemplate.overview}
                                    </p>
                                </div>

                                {/* Theory */}
                                {selectedTemplate.theory && (
                                    <div className="mb-6">
                                        <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
                                            Theory
                                        </h3>
                                        <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                            {selectedTemplate.theory}
                                        </pre>
                                    </div>
                                )}

                                {/* Steps Preview */}
                                <div className="mb-6">
                                    <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
                                        Implementation Steps
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedTemplate.steps.map((step, index) => (
                                            <div
                                                key={step.id}
                                                className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
                                            >
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {step.title}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {step.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4">
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleStartLearning(selectedTemplate)}
                                        className="flex-1"
                                    >
                                        <BookOpen className="mr-2 h-4 w-4" />
                                        Learning Mode
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => handleStartImplementation(selectedTemplate)}
                                        className="flex-1"
                                    >
                                        <Wrench className="mr-2 h-4 w-4" />
                                        Implementation Mode
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* Template Grid */
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {/* Playground Card - Always shown at top */}
                                {selectedCategory === 'all' && (
                                    <button
                                        onClick={handleOpenPlayground}
                                        className="gradient-card-bg group col-span-full rounded-lg p-6 text-left transition-all hover:scale-[1.01] hover:shadow-lg"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                                                    <Sparkles className="h-7 w-7 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="flex items-center gap-2 text-xl font-semibold text-white">
                                                        Playground
                                                        <Zap className="h-5 w-5 text-yellow-300" />
                                                    </h3>
                                                    <p className="mt-1 text-sm text-white/80">
                                                        Free practice mode - Build any circuit from
                                                        scratch
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-white/80 transition-colors group-hover:text-white">
                                                <span className="text-sm font-medium">
                                                    Start Building
                                                </span>
                                                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-3 text-xs text-white/70">
                                            <span className="flex items-center gap-1">
                                                <span className="h-2 w-2 rounded-full bg-green-400"></span>
                                                Full component library
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                                                Circuit simulation
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                                                Auto-save enabled
                                            </span>
                                        </div>
                                    </button>
                                )}

                                {filteredTemplates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template)}
                                        className="rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500"
                                    >
                                        <div className="mb-2 flex items-start justify-between">
                                            <h3 className="font-medium text-gray-900 dark:text-white">
                                                {template.name}
                                            </h3>
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                                            {template.description}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={getDifficultyColor(template.difficulty)}
                                                size="sm"
                                            >
                                                {template.difficulty}
                                            </Badge>
                                            <span className="text-xs text-gray-400">
                                                {template.steps.length} steps
                                            </span>
                                        </div>
                                    </button>
                                ))}

                                {filteredTemplates.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
                                        No templates found in this category
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
