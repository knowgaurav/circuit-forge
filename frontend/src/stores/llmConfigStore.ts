/**
 * LLM Configuration Store
 * 
 * **Feature: user-llm-api-keys**
 * **Validates: Requirements 2.5, 7.7, 7.8**
 * 
 * - API key stored in session storage (cleared on tab close)
 * - Provider/model preferences stored in local storage (persisted)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getDefaultModel } from '@/constants/llmProviders';

interface LLMConfigState {
    // Session storage (cleared on tab close) - managed separately
    apiKey: string | null;

    // Local storage (persisted)
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;

    // Actions
    setApiKey: (key: string) => void;
    clearApiKey: () => void;
    setProvider: (provider: string) => void;
    setModel: (model: string) => void;
    setAdvancedSettings: (temperature: number, maxTokens: number) => void;
    isConfigured: () => boolean;
    getConfig: () => LLMConfig | null;
}

export interface LLMConfig {
    provider: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
}

const SESSION_KEY = 'llm-api-key';

// Session storage helpers
const getSessionApiKey = (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(SESSION_KEY);
};

const setSessionApiKey = (key: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SESSION_KEY, key);
};

const clearSessionApiKey = (): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SESSION_KEY);
};

export const useLLMConfigStore = create<LLMConfigState>()(
    persist(
        (set, get) => ({
            // API key is managed via session storage, not persisted
            apiKey: null,

            // Defaults
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 4000,

            setApiKey: (key: string) => {
                setSessionApiKey(key);
                set({ apiKey: key });
            },

            clearApiKey: () => {
                clearSessionApiKey();
                set({ apiKey: null });
            },

            setProvider: (provider: string) => {
                const defaultModel = getDefaultModel(provider);
                set({
                    provider,
                    model: defaultModel?.id || ''
                });
            },

            setModel: (model: string) => set({ model }),

            setAdvancedSettings: (temperature: number, maxTokens: number) =>
                set({ temperature, maxTokens }),

            isConfigured: () => {
                const state = get();
                const apiKey = state.apiKey || getSessionApiKey();
                return !!(apiKey && state.provider && state.model);
            },

            getConfig: () => {
                const state = get();
                const apiKey = state.apiKey || getSessionApiKey();
                if (!apiKey || !state.provider || !state.model) return null;
                return {
                    provider: state.provider,
                    apiKey,
                    model: state.model,
                    temperature: state.temperature,
                    maxTokens: state.maxTokens,
                };
            },
        }),
        {
            name: 'llm-config',
            storage: createJSONStorage(() => localStorage),
            // Only persist preferences, not the API key
            partialize: (state) => ({
                provider: state.provider,
                model: state.model,
                temperature: state.temperature,
                maxTokens: state.maxTokens,
            }),
        }
    )
);
