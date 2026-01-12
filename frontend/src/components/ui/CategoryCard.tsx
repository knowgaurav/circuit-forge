'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

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
            className="glass-card group h-full cursor-pointer p-6 transition-all duration-300 hover:scale-[1.02]"
            data-testid={`category-card-${id}`}
        >
            <div className="flex items-start gap-4">
                <div className="from-primary/20 to-accent/20 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-primary transition-colors group-hover:text-accent">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <h3
                        className="font-semibold text-foreground transition-colors group-hover:text-primary"
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
                        className="mt-3 flex items-center gap-1 text-xs font-medium text-primary"
                        data-testid="category-count"
                    >
                        <span className="bg-primary/60 h-1.5 w-1.5 rounded-full"></span>
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
