'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';

import { branchSession } from '@/services/replay';

export interface BranchButtonProps {
    sessionCode: string;
    fromSeq: number;
    onBranched: (newCode: string) => void;
}

export function BranchButton({ sessionCode, fromSeq, onBranched }: BranchButtonProps) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClick = async () => {
        setPending(true);
        setError(null);
        try {
            const { code } = await branchSession(sessionCode, fromSeq);
            onBranched(code);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleClick}
                disabled={pending}
            >
                {pending ? 'Branching…' : 'Branch from here'}
            </Button>
            {error && (
                <span className="text-xs text-error" role="alert">
                    {error}
                </span>
            )}
        </div>
    );
}
