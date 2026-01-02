'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Wrench, ChevronRight, Sparkles, Zap, ArrowLeft } from 'lucide-react';
import { Button, Badge, Panel } from '@/components/ui';
import { Navbar } from '@/components/ui/Navbar';
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

    const filteredTemplates = selectedCategory === 'all'
        ? TEMPLATES
        : getTemplatesByCategory(selectedCategory);

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

            <div className="max-w-7xl mx-auto px-6 py-8 pt-24">
                <div className="flex gap-8">
                    {/* Sidebar - Categories */}
                    <div className="w-64 flex-shrink-0">
                        <Panel title="Categories">
                            <div className="space-y-1">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === 'all'
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                                        }`}
                                >
                                    All Templates
                                </button>
                                {(Object.entries(TEMPLATE_CATEGORIES) as [TemplateCategory, typeof TEMPLATE_CATEGORIES[TemplateCategory]][]).map(
                                    ([key, category]) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedCategory(key)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === key
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                                                }`}
                                        >
                                            <span className="mr-2">{category.icon}</span>
                                            {category.name}
                                            <span className="ml-2 text-gray-400">
                                                ({getTemplatesByCategory(key).length})
                                            </span>
                                        </button>
                                    )
                                )}
                            </div>
                        </Panel>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {selectedTemplate ? (
                            /* Template Detail View */
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                                <button
                                    onClick={() => setSelectedTemplate(null)}
                                    className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to templates
                                </button>

                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                            {selectedTemplate.name}
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedTemplate.description}</p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <Badge variant={getDifficultyColor(selectedTemplate.difficulty)}>
                                                {selectedTemplate.difficulty}
                                            </Badge>
                                            <Badge variant="default">
                                                {TEMPLATE_CATEGORIES[selectedTemplate.category].name}
                                            </Badge>
                                            <Badge variant="default">
                                                {selectedTemplate.steps.length} steps
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Overview */}
                                <div className="mb-6">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Overview</h3>
                                    <p className="text-gray-600 dark:text-gray-400">{selectedTemplate.overview}</p>
                                </div>

                                {/* Theory */}
                                {selectedTemplate.theory && (
                                    <div className="mb-6">
                                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Theory</h3>
                                        <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                                            {selectedTemplate.theory}
                                        </pre>
                                    </div>
                                )}

                                {/* Steps Preview */}
                                <div className="mb-6">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Implementation Steps</h3>
                                    <div className="space-y-2">
                                        {selectedTemplate.steps.map((step, index) => (
                                            <div
                                                key={step.id}
                                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center text-sm font-medium">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{step.title}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{step.description}</p>
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
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Learning Mode
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => handleStartImplementation(selectedTemplate)}
                                        className="flex-1"
                                    >
                                        <Wrench className="w-4 h-4 mr-2" />
                                        Implementation Mode
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* Template Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Playground Card - Always shown at top */}
                                {selectedCategory === 'all' && (
                                    <button
                                        onClick={handleOpenPlayground}
                                        className="col-span-full gradient-card-bg rounded-lg p-6 text-left hover:shadow-lg hover:scale-[1.01] transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                                    <Sparkles className="w-7 h-7 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                                        Playground
                                                        <Zap className="w-5 h-5 text-yellow-300" />
                                                    </h3>
                                                    <p className="text-white/80 text-sm mt-1">
                                                        Free practice mode - Build any circuit from scratch
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors">
                                                <span className="text-sm font-medium">Start Building</span>
                                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-3 text-white/70 text-xs">
                                            <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                Full component library
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                                Circuit simulation
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                                                Auto-save enabled
                                            </span>
                                        </div>
                                    </button>
                                )}

                                {filteredTemplates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template)}
                                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-left hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{template.description}</p>
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
                                    <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
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
