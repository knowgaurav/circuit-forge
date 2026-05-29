'use client';

import { useState, useEffect } from 'react';

import { Key, Check } from 'lucide-react';

import { getProvider } from '@/constants/llmProviders';
import { useLLMConfigStore } from '@/stores/llmConfigStore';

import { APIKeyModal } from './APIKeyModal';

export function FloatingLLMButton() {
    const [showModal, setShowModal] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const llmStore = useLLMConfigStore();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const isConfigured = isMounted && llmStore.isConfigured();
    const provider = isMounted ? getProvider(llmStore.provider) : null;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className={`group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-out hover:scale-110 hover:shadow-xl active:scale-95 ${
                    isConfigured
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 hover:scale-105'
                } `}
                title={
                    isConfigured ? `${provider?.name || 'AI'} configured` : 'Configure AI Provider'
                }
            >
                {isConfigured ? (
                    <div className="relative">
                        <Key className="h-6 w-6 text-white" />
                        <div className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-white">
                            <Check className="h-2 w-2 text-green-600" />
                        </div>
                    </div>
                ) : (
                    <Key className="h-6 w-6 text-white" />
                )}

                {/* Tooltip */}
                <span className="pointer-events-none absolute right-full mr-3 translate-x-2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                    {isConfigured ? `${provider?.name} - ${llmStore.model}` : 'Configure AI'}
                </span>
            </button>

            <APIKeyModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSave={() => setShowModal(false)}
            />
        </>
    );
}
