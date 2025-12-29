'use client';

import Link from 'next/link';

export interface TemplateCardProps {
    id: string;
    name: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    category: string;
    description: string;
    href?: string;
}

const difficultyColors = {
    beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
    intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function TemplateCard({ id, name, difficulty, category, description, href }: TemplateCardProps) {
    const cardContent = (
        <div
            className="glass-card p-5 h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer group"
            data-testid={`template-card-${id}`}
        >
            <div className="flex items-center gap-2 mb-3">
                <span
                    className={`text-xs px-2 py-1 rounded-full border ${difficultyColors[difficulty]}`}
                    data-testid="template-difficulty"
                >
                    {difficulty}
                </span>
                <span
                    className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    data-testid="template-category"
                >
                    {category}
                </span>
            </div>
            <h3
                className="font-semibold text-white group-hover:text-purple-200 transition-colors mb-2"
                data-testid="template-name"
            >
                {name}
            </h3>
            <p className="text-sm text-gray-400 line-clamp-2">
                {description}
            </p>
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

export default TemplateCard;
