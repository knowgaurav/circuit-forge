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
                                            ? 'border-primary/30 bg-primary/10 border font-medium text-primary'
                                            : 'border border-transparent text-text-secondary hover:bg-surface-secondary hover:text-foreground'
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
                                                ? 'border-primary/30 bg-primary/10 border font-medium text-primary'
                                                : 'border border-transparent text-text-secondary hover:bg-surface-secondary hover:text-foreground'
                                        }`}
                                    >
                                        <span className="mr-2">{category.icon}</span>
                                        {category.name}
                                        <span className="ml-2 font-mono text-xs text-text-muted">
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
                            <div className="clip-corner rounded-xl border border-border bg-surface p-6">
                                <button
                                    onClick={() => setSelectedTemplate(null)}
                                    className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-muted transition-colors hover:text-primary"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to templates
                                </button>

                                <div className="mb-6 flex items-start justify-between">
                                    <div>
                                        <h2 className="font-heading text-2xl font-semibold text-foreground">
                                            {selectedTemplate.name}
                                        </h2>
                                        <p className="mt-1 text-text-secondary">
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
                                    <h3 className="eyebrow mb-2">Overview</h3>
                                    <p className="text-text-secondary">
                                        {selectedTemplate.overview}
                                    </p>
                                </div>

                                {/* Theory */}
                                {selectedTemplate.theory && (
                                    <div className="mb-6">
                                        <h3 className="eyebrow mb-2">Theory</h3>
                                        <pre className="whitespace-pre-wrap rounded-lg border border-border bg-surface-secondary p-4 font-mono text-sm text-text-secondary">
                                            {selectedTemplate.theory}
                                        </pre>
                                    </div>
                                )}

                                {/* Steps Preview */}
                                <div className="mb-6">
                                    <h3 className="eyebrow mb-2">Implementation Steps</h3>
                                    <div className="space-y-2">
                                        {selectedTemplate.steps.map((step, index) => (
                                            <div
                                                key={step.id}
                                                className="flex items-center gap-3 rounded-lg border border-border bg-surface-secondary p-3"
                                            >
                                                <div className="border-primary/30 bg-primary/10 flex h-6 w-6 items-center justify-center rounded border font-mono text-sm font-medium text-primary">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {step.title}
                                                    </p>
                                                    <p className="text-sm text-text-muted">
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
                                        className="gradient-card-bg clip-corner group col-span-full rounded-xl p-6 text-left transition-all hover:scale-[1.005] hover:shadow-glow"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur">
                                                    <Sparkles className="h-7 w-7 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="flex items-center gap-2 font-heading text-xl font-semibold text-white">
                                                        Playground
                                                        <Zap className="h-5 w-5 text-accent-amber" />
                                                    </h3>
                                                    <p className="mt-1 text-sm text-white/80">
                                                        Free practice mode - Build any circuit from
                                                        scratch
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-white/80 transition-colors group-hover:text-white">
                                                <span className="font-mono text-xs uppercase tracking-wider">
                                                    Start Building
                                                </span>
                                                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-4 font-mono text-xs text-white/70">
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-accent-lime"></span>
                                                Full component library
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-white/70"></span>
                                                Circuit simulation
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-accent-amber"></span>
                                                Auto-save enabled
                                            </span>
                                        </div>
                                    </button>
                                )}

                                {filteredTemplates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template)}
                                        className="hover:border-primary/50 group rounded-xl border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-glow"
                                    >
                                        <div className="mb-2 flex items-start justify-between">
                                            <h3 className="font-heading font-medium text-foreground transition-colors group-hover:text-primary">
                                                {template.name}
                                            </h3>
                                            <ChevronRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                                        </div>
                                        <p className="mb-3 text-sm text-text-secondary">
                                            {template.description}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={getDifficultyColor(template.difficulty)}
                                                size="sm"
                                            >
                                                {template.difficulty}
                                            </Badge>
                                            <span className="font-mono text-xs text-text-muted">
                                                {template.steps.length} steps
                                            </span>
                                        </div>
                                    </button>
                                ))}

                                {filteredTemplates.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-text-muted">
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
