/**
 * LLM Provider configuration constants
 *
 * **Feature: user-llm-api-keys**
 * **Validates: Requirements 1.3, 3.1, 3.2, 3.3, 3.4, 7.3**
 */

export interface ModelOption {
    id: string;
    name: string;
    description: string;
    isDefault?: boolean;
}

export interface LLMProvider {
    id: string;
    name: string;
    icon: string;
    logoUrl?: string;
    description: string;
    keyPrefix?: string;
    docsUrl: string;
    models: ModelOption[];
    requiresBaseUrl?: boolean;
    requiresToken?: boolean;
}

export const LLM_PROVIDERS: LLMProvider[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        icon: '🤖',
        logoUrl: 'https://cdn.simpleicons.org/chatbot/white',
        description: 'Affordable GPT models with tool calling',
        keyPrefix: 'sk-',
        docsUrl: 'https://platform.openai.com/api-keys',
        models: [
            {
                id: 'gpt-5.4-mini',
                name: 'GPT-5.4 Mini',
                description: 'Strongest mini model for coding and subagents',
                isDefault: true,
            },
            {
                id: 'gpt-5.4-nano',
                name: 'GPT-5.4 Nano',
                description: 'Cheapest GPT-5.4-class for high-volume tasks',
            },
            {
                id: 'gpt-5.4',
                name: 'GPT-5.4',
                description: 'Affordable model for coding and professional work',
            },
            {
                id: 'gpt-5.5',
                name: 'GPT-5.5',
                description: 'Frontier intelligence for coding and professional work',
            },
            {
                id: 'gpt-5.5-pro',
                name: 'GPT-5.5 Pro',
                description: 'Smarter, more precise responses for complex tasks',
            },
        ],
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        icon: '🧠',
        logoUrl: 'https://cdn.simpleicons.org/anthropic/white',
        description: 'Affordable Claude models with tool calling',
        keyPrefix: 'sk-ant-',
        docsUrl: 'https://console.anthropic.com/settings/keys',
        models: [
            {
                id: 'claude-haiku-4-5',
                name: 'Claude Haiku 4.5',
                description: 'Fastest model with near-frontier intelligence',
                isDefault: true,
            },
            {
                id: 'claude-sonnet-4-5',
                name: 'Claude Sonnet 4.5',
                description: 'Previous balance of speed and intelligence',
            },
            {
                id: 'claude-sonnet-4-6',
                name: 'Claude Sonnet 4.6',
                description: 'Best balance of speed and intelligence',
            },
            {
                id: 'claude-opus-4-7',
                name: 'Claude Opus 4.7',
                description: 'Capable model for complex agentic coding',
            },
            {
                id: 'claude-opus-4-8',
                name: 'Claude Opus 4.8',
                description: 'Most capable model for reasoning and agentic coding',
            },
        ],
    },
    {
        id: 'google',
        name: 'Google',
        icon: '✨',
        logoUrl: 'https://cdn.simpleicons.org/googlegemini/white',
        description: 'Gemini models on Vertex AI (express mode)',
        docsUrl: 'https://console.cloud.google.com/expressmode',
        models: [
            {
                id: 'gemini-3.1-flash-lite',
                name: 'Gemini 3.1 Flash-Lite',
                description: 'Frontier-class performance at lowest cost',
                isDefault: true,
            },
            {
                id: 'gemini-2.5-pro',
                name: 'Gemini 2.5 Pro',
                description: 'Advanced reasoning with 1M context',
            },
            {
                id: 'gemini-3-flash-preview',
                name: 'Gemini 3 Flash',
                description: 'Frontier performance rivaling larger models',
            },
            {
                id: 'gemini-3.5-flash',
                name: 'Gemini 3.5 Flash',
                description: 'Most intelligent for agentic and coding tasks',
            },
            {
                id: 'gemini-3.1-pro-preview',
                name: 'Gemini 3.1 Pro',
                description: 'Most advanced intelligence and agentic coding',
            },
        ],
    },
    {
        id: 'ohmygpt',
        name: 'OHMYGPT',
        icon: '⚡',
        logoUrl: 'https://cdn.simpleicons.org/lightning/white',
        description: 'Access affordable models through OHMYGPT',
        docsUrl: 'https://www.ohmygpt.com/',
        models: [
            {
                id: 'gpt-5.4-mini',
                name: 'GPT-5.4 Mini',
                description: 'OpenAI GPT-5.4 Mini via OHMYGPT',
                isDefault: true,
            },
            {
                id: 'gpt-5.5',
                name: 'GPT-5.5',
                description: 'OpenAI frontier model via OHMYGPT',
            },
            {
                id: 'claude-haiku-4-5',
                name: 'Claude Haiku 4.5',
                description: 'Anthropic Haiku via OHMYGPT',
            },
            {
                id: 'claude-sonnet-4-6',
                name: 'Claude Sonnet 4.6',
                description: 'Anthropic Sonnet via OHMYGPT',
            },
            {
                id: 'gemini-3.5-flash',
                name: 'Gemini 3.5 Flash',
                description: 'Google Gemini via OHMYGPT',
            },
        ],
    },

    {
        id: 'openrouter',
        name: 'OpenRouter',
        icon: '🌐',
        logoUrl: 'https://cdn.simpleicons.org/openrouter/white',
        description: 'Access affordable models through OpenRouter',
        keyPrefix: 'sk-or-',
        docsUrl: 'https://openrouter.ai/keys',
        models: [
            {
                id: 'moonshotai/kimi-k2.6:free',
                name: 'Kimi K2.6 (Free)',
                description: 'Free - Moonshot multimodal, long-horizon coding',
                isDefault: true,
            },
            {
                id: 'deepseek/deepseek-v4-flash:free',
                name: 'DeepSeek V4 Flash (Free)',
                description: 'Free - DeepSeek 284B MoE, 1M context',
            },
            {
                id: 'qwen/qwen3-coder:free',
                name: 'Qwen3 Coder 480B (Free)',
                description: 'Free - Qwen 480B for coding tasks',
            },
            {
                id: 'qwen/qwen3-next-80b-a3b-instruct:free',
                name: 'Qwen3 Next 80B (Free)',
                description: 'Free - Qwen 80B for reasoning and code',
            },
            {
                id: 'minimax/minimax-m2.5:free',
                name: 'MiniMax M2.5 (Free)',
                description: 'Free - SOTA model for coding and agents',
            },
            {
                id: 'z-ai/glm-4.5-air:free',
                name: 'GLM 4.5 Air (Free)',
                description: 'Free - Z.ai agent-centric MoE model',
            },
            {
                id: 'nvidia/nemotron-3-super-120b-a12b:free',
                name: 'Nemotron 3 Super 120B (Free)',
                description: 'Free - NVIDIA 120B MoE for multi-agent',
            },
            {
                id: 'openai/gpt-oss-120b:free',
                name: 'GPT-OSS-120B (Free)',
                description: 'Free - OpenAI open-source 117B MoE',
            },
            {
                id: 'meta-llama/llama-3.3-70b-instruct:free',
                name: 'Llama 3.3 70B (Free)',
                description: 'Free - Meta Llama 3.3 multilingual',
            },
            {
                id: 'google/gemma-4-31b-it:free',
                name: 'Gemma 4 31B (Free)',
                description: 'Free - Google multimodal model',
            },
        ],
    },
    {
        id: 'local',
        name: 'Local LLM',
        icon: '🏠',
        description: 'Connect your local Ollama, LM Studio, vLLM, or any OpenAI-compatible server',
        docsUrl: 'https://github.com/Algozenith/circuit-forge/tree/main/cli',
        requiresBaseUrl: true,
        requiresToken: true,
        models: [],
    },
];

/**
 * Get provider by ID
 */
export function getProvider(providerId: string): LLMProvider | undefined {
    return LLM_PROVIDERS.find((p) => p.id === providerId);
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(providerId: string): ModelOption | undefined {
    const provider = getProvider(providerId);
    if (!provider) return undefined;
    return provider.models.find((m) => m.isDefault) || provider.models[0];
}

/**
 * Validate API key format for a provider
 */
export function validateKeyFormat(
    providerId: string,
    apiKey: string
): { valid: boolean; error?: string } {
    const provider = getProvider(providerId);
    if (!provider) {
        return { valid: false, error: 'Unknown provider' };
    }

    // Local provider doesn't use API keys
    if (provider.requiresBaseUrl) {
        return { valid: true };
    }

    if (!apiKey || apiKey.length < 10) {
        return { valid: false, error: 'API key is too short' };
    }

    if (provider.keyPrefix && !apiKey.startsWith(provider.keyPrefix)) {
        return { valid: false, error: `API key should start with '${provider.keyPrefix}'` };
    }

    return { valid: true };
}

/**
 * Validate base URL format for local provider
 */
export function validateBaseUrl(baseUrl: string): { valid: boolean; error?: string } {
    if (!baseUrl) {
        return { valid: false, error: 'Tunnel URL is required' };
    }

    try {
        const url = new URL(baseUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
            return { valid: false, error: 'URL must start with http:// or https://' };
        }
        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Validate bridge token format
 */
export function validateBridgeToken(token: string): { valid: boolean; error?: string } {
    if (!token) {
        return { valid: false, error: 'Bridge token is required' };
    }
    if (token.length < 20) {
        return { valid: false, error: 'Token appears to be too short' };
    }
    return { valid: true };
}
