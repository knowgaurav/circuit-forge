'use client';

import Link from 'next/link';

import type { ReactNode } from 'react';

export interface CategoryCardProps {
    id: string;
    name: string;
    description: string;
    icon: ReactNode;
    count: number;
    href?: string;
}

export function CategoryCard({ id, name, description, icon, count, href }: CategoryCardProps) {
    const cardContent = (
        <div
            className="hover:border-primary/50 group relative h-full cursor-pointer overflow-hidden rounded-xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow"
            data-testid={`category-card-${id}`}
        >
            {/* corner node markers */}
            <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-border-strong transition-colors group-hover:bg-primary" />
            <div className="flex items-start gap-4">
                <div className="border-primary/30 bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg border text-primary transition-all group-hover:border-primary group-hover:shadow-glow">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <h3
                        className="font-heading font-semibold text-foreground transition-colors group-hover:text-primary"
                        data-testid="category-name"
                    >
                        {name}
                    </h3>
                    <p
                        className="mt-1 line-clamp-2 text-sm text-text-secondary"
                        data-testid="category-description"
                    >
                        {description}
                    </p>
                    <div
                        className="mt-3 flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-primary"
                        data-testid="category-count"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                        {count} components
                    </div>
                </div>
            </div>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block h-full">
                {cardContent}
            </Link>
        );
    }

    return cardContent;
}

export default CategoryCard;
