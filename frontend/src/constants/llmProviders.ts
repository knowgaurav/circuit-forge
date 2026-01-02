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
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, affordable small model', isDefault: true },
            { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Fastest, most cost-efficient GPT-5' },
            { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Cost-efficient GPT-5 for defined tasks' },
            { id: 'gpt-5', name: 'GPT-5', description: 'Intelligent reasoning model for complex tasks' },
            { id: 'gpt-5.1', name: 'GPT-5.1', description: 'Best for coding and agentic tasks' },
            { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Latest and most capable model' },
            { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: 'Fastest, most cost-efficient GPT-4.1' },
            { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Smaller, faster GPT-4.1' },
            { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Smartest non-reasoning model' },
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Fast, intelligent, flexible GPT model' },
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
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest, most affordable Claude', isDefault: true },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Best balance of speed and intelligence' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable Claude model' },
        ],
    },
    {
        id: 'google',
        name: 'Google',
        icon: '✨',
        logoUrl: 'https://cdn.simpleicons.org/googlegemini/white',
        description: 'Affordable Gemini models with tool calling',
        docsUrl: 'https://aistudio.google.com/app/apikey',
        models: [
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and affordable', isDefault: true },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable Gemini model' },
            { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: 'Balanced performance' },
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
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'OpenAI GPT-4o Mini via OHMYGPT', isDefault: true },
            { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI GPT-4o via OHMYGPT' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Anthropic Claude via OHMYGPT' },
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
            { id: 'xiaomi/mimo-v2-flash:free', name: 'MiMo-V2-Flash (Free)', description: 'Free - Xiaomi 309B MoE, #1 open-source', isDefault: true },
            { id: 'mistralai/devstral-2512:free', name: 'Devstral 2 (Free)', description: 'Free - Mistral 123B for agentic coding' },
            { id: 'kwaipilot/kat-coder-pro:free', name: 'KAT-Coder-Pro (Free)', description: 'Free - KwaiKAT agentic coding model' },
            { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1 (Free)', description: 'Free - DeepSeek 671B reasoning model' },
            { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder 480B (Free)', description: 'Free - Qwen 480B for coding tasks' },
            { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', description: 'Free - Meta Llama 3.3 multilingual' },
            { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B (Free)', description: 'Free - Google multimodal model' },
            { id: 'openai/gpt-oss-120b:free', name: 'GPT-OSS-120B (Free)', description: 'Free - OpenAI open-source 117B MoE' },
            { id: 'moonshotai/kimi-k2:free', name: 'Kimi K2 (Free)', description: 'Free - Moonshot 1T params, tool use' },
            { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', description: 'Free - Google 1M context experimental' },
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
    return LLM_PROVIDERS.find(p => p.id === providerId);
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(providerId: string): ModelOption | undefined {
    const provider = getProvider(providerId);
    if (!provider) return undefined;
    return provider.models.find(m => m.isDefault) || provider.models[0];
}

/**
 * Validate API key format for a provider
 */
export function validateKeyFormat(providerId: string, apiKey: string): { valid: boolean; error?: string } {
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
