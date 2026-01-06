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
            className="glass-card p-6 h-full transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
            data-testid={`category-card-${id}`}
        >
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary group-hover:text-accent transition-colors">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors" data-testid="category-name">
                        {name}
                    </h3>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2" data-testid="category-description">
                        {description}
                    </p>
                    <div className="text-xs text-primary font-medium mt-3 flex items-center gap-1" data-testid="category-count">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
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
