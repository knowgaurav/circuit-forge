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
    
    // Local LLM specific (session storage)
    baseUrl: string | null;
    bridgeToken: string | null;

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
}

const SESSION_KEY = 'llm-api-key';
const SESSION_BASE_URL_KEY = 'llm-base-url';
const SESSION_TOKEN_KEY = 'llm-bridge-token';

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
            // API key is managed via session storage, not persisted
            apiKey: null,
            
            // Local LLM specific (session storage)
            baseUrl: null,
            bridgeToken: null,

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
                    const apiKey = state.apiKey || getSessionApiKey();
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
                    const apiKey = state.apiKey || getSessionApiKey();
                    if (!apiKey || !state.provider || !state.model) return null;
                    return {
                        provider: state.provider,
                        apiKey,
                        model: state.model,
                        temperature: state.temperature,
                        maxTokens: state.maxTokens,
                    };
                }
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
