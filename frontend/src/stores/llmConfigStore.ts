/**
 * LLM Configuration Store
 *
 * **Feature: user-llm-api-keys**
 * **Validates: Requirements 2.5, 7.7, 7.8**
 *
 * - Cloud API key + provider/model preferences persisted in local storage
 *   (saved once, survives tab close).
 * - Local LLM tunnel URL/token kept in session storage (ephemeral per CLI run).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { getDefaultModel } from '@/constants/llmProviders';

interface LLMConfigState {
    // Local storage (persisted, saved once)
    apiKey: string | null;

    // Local LLM specific (session storage)
    baseUrl: string | null;
    bridgeToken: string | null;

    // Local storage (persisted)
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    // Google Vertex AI location (persisted preference)
    location: string;

    // Actions
    setApiKey: (key: string) => void;
    clearApiKey: () => void;
    setProvider: (provider: string) => void;
    setModel: (model: string) => void;
    setLocation: (location: string) => void;
    setAdvancedSettings: (temperature: number, maxTokens: number) => void;
    setLocalConfig: (baseUrl: string, token: string) => void;
    clearLocalConfig: () => void;
    isConfigured: () => boolean;
    getConfig: () => LLMConfig | null;
}

export interface LLMConfig {
    provider: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    // Local LLM specific
    baseUrl?: string;
    bridgeToken?: string;
    // Google Vertex AI specific
    location?: string;
}

const SESSION_BASE_URL_KEY = 'llm-base-url';
const SESSION_TOKEN_KEY = 'llm-bridge-token';

// Local LLM session storage helpers
const getSessionBaseUrl = (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(SESSION_BASE_URL_KEY);
};

const setSessionBaseUrl = (url: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SESSION_BASE_URL_KEY, url);
};

const getSessionBridgeToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
};

const setSessionBridgeToken = (token: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
};

const clearLocalSessionData = (): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SESSION_BASE_URL_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
};

export const useLLMConfigStore = create<LLMConfigState>()(
    persist(
        (set, get) => ({
            // API key persisted in local storage (saved once)
            apiKey: null,

            // Local LLM specific (session storage)
            baseUrl: null,
            bridgeToken: null,

            // Defaults
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 4000,
            location: 'global',

            setApiKey: (key: string) => {
                set({ apiKey: key });
            },

            clearApiKey: () => {
                set({ apiKey: null });
            },

            setProvider: (provider: string) => {
                const defaultModel = getDefaultModel(provider);
                set({
                    provider,
                    model: defaultModel?.id || '',
                });
            },

            setModel: (model: string) => set({ model }),

            setLocation: (location: string) => set({ location }),

            setAdvancedSettings: (temperature: number, maxTokens: number) =>
                set({ temperature, maxTokens }),

            setLocalConfig: (baseUrl: string, token: string) => {
                setSessionBaseUrl(baseUrl);
                setSessionBridgeToken(token);
                set({ baseUrl, bridgeToken: token });
            },

            clearLocalConfig: () => {
                clearLocalSessionData();
                set({ baseUrl: null, bridgeToken: null });
            },

            isConfigured: () => {
                const state = get();
                const isLocalProvider = state.provider === 'local';

                if (isLocalProvider) {
                    const baseUrl = state.baseUrl || getSessionBaseUrl();
                    const token = state.bridgeToken || getSessionBridgeToken();
                    return !!(baseUrl && token && state.model);
                } else {
                    const apiKey = state.apiKey;
                    return !!(apiKey && state.provider && state.model);
                }
            },

            getConfig: () => {
                const state = get();
                const isLocalProvider = state.provider === 'local';

                if (isLocalProvider) {
                    const baseUrl = state.baseUrl || getSessionBaseUrl();
                    const token = state.bridgeToken || getSessionBridgeToken();
                    if (!baseUrl || !token || !state.model) return null;
                    return {
                        provider: state.provider,
                        apiKey: '', // Not used for local
                        model: state.model,
                        temperature: state.temperature,
                        maxTokens: state.maxTokens,
                        baseUrl,
                        bridgeToken: token,
                    };
                } else {
                    const apiKey = state.apiKey;
                    if (!apiKey || !state.provider || !state.model) return null;
                    return {
                        provider: state.provider,
                        apiKey,
                        model: state.model,
                        temperature: state.temperature,
                        maxTokens: state.maxTokens,
                        location: state.location,
                    };
                }
            },
        }),
        {
            name: 'llm-config',
            storage: createJSONStorage(() => localStorage),
            // Persist preferences and the cloud API key (saved once). Local LLM
            // tunnel URL/token stay in session storage (ephemeral per CLI run).
            partialize: (state) => ({
                apiKey: state.apiKey,
                provider: state.provider,
                model: state.model,
                temperature: state.temperature,
                maxTokens: state.maxTokens,
                location: state.location,
            }),
        }
    )
);
