'use client';

import { useState, useEffect } from 'react';

import {
    X,
    ExternalLink,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronUp,
    Loader2,
    CheckCircle,
    AlertCircle,
    Key,
    Cpu,
    Sparkles,
    Terminal,
    RefreshCw,
} from 'lucide-react';

import {
    LLM_PROVIDERS,
    getProvider,
    validateKeyFormat,
    validateBaseUrl,
    validateBridgeToken,
} from '@/constants/llmProviders';
import { api } from '@/services/api';
import { useLLMConfigStore } from '@/stores/llmConfigStore';

interface APIKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function APIKeyModal({ isOpen, onClose, onSave }: APIKeyModalProps) {
    const store = useLLMConfigStore();

    const [selectedProvider, setSelectedProvider] = useState(store.provider);
    const [apiKey, setApiKey] = useState('');
    const [selectedModel, setSelectedModel] = useState(store.model);
    const [showKey, setShowKey] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [temperature, setTemperature] = useState(store.temperature);
    const [maxTokens, setMaxTokens] = useState(store.maxTokens);

    const [testStatus, setTestStatus] = useState<TestStatus>('idle');
    const [testError, setTestError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Google Vertex AI location (express mode)
    const [location, setLocation] = useState(store.location);

    // Local LLM specific state
    const [baseUrl, setBaseUrl] = useState('');
    const [bridgeToken, setBridgeToken] = useState('');
    const [baseUrlError, setBaseUrlError] = useState<string | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [localModels, setLocalModels] = useState<
        Array<{ id: string; name: string; description: string }>
    >([]);
    const [fetchingModels, setFetchingModels] = useState(false);

    const provider = getProvider(selectedProvider);
    const isLocalProvider = provider?.requiresBaseUrl === true;
    const isGoogleProvider = selectedProvider === 'google';
    const models = isLocalProvider ? localModels : provider?.models || [];

    useEffect(() => {
        if (isOpen) {
            setSelectedProvider(store.provider);
            setSelectedModel(store.model);
            setApiKey('');
            setTemperature(store.temperature);
            setMaxTokens(store.maxTokens);
            setLocation(store.location);
            setTestStatus('idle');
            setTestError(null);
            setValidationError(null);
            // Reset local LLM state
            setBaseUrl('');
            setBridgeToken('');
            setBaseUrlError(null);
            setTokenError(null);
            setLocalModels([]);
        }
    }, [isOpen, store.provider, store.model, store.temperature, store.maxTokens, store.location]);

    useEffect(() => {
        const newProvider = getProvider(selectedProvider);
        if (newProvider) {
            // Reset state when switching providers
            setTestStatus('idle');
            setTestError(null);

            if (newProvider.requiresBaseUrl) {
                // Local provider - clear API key state, keep local state
                setApiKey('');
                setValidationError(null);
                setSelectedModel('');
            } else {
                // Cloud provider - clear local state
                setBaseUrl('');
                setBridgeToken('');
                setBaseUrlError(null);
                setTokenError(null);
                setLocalModels([]);
                const defaultModel =
                    newProvider.models.find((m) => m.isDefault) || newProvider.models[0];
                if (defaultModel) {
                    setSelectedModel(defaultModel.id);
                }
            }
        }
    }, [selectedProvider]);

    const handleApiKeyChange = (value: string) => {
        setApiKey(value);
        setTestStatus('idle');
        setTestError(null);

        if (value) {
            const result = validateKeyFormat(selectedProvider, value);
            setValidationError(result.valid ? null : result.error || null);
        } else {
            setValidationError(null);
        }
    };

    const handleBaseUrlChange = (value: string) => {
        setBaseUrl(value);
        setTestStatus('idle');
        setTestError(null);
        setLocalModels([]);
        setSelectedModel('');

        if (value) {
            const result = validateBaseUrl(value);
            setBaseUrlError(result.valid ? null : result.error || null);
        } else {
            setBaseUrlError(null);
        }
    };

    const handleTokenChange = (value: string) => {
        setBridgeToken(value);
        setTestStatus('idle');
        setTestError(null);

        if (value) {
            const result = validateBridgeToken(value);
            setTokenError(result.valid ? null : result.error || null);
        } else {
            setTokenError(null);
        }
    };

    const handleFetchModels = async () => {
        if (!baseUrl || baseUrlError || !bridgeToken || tokenError) return;

        setFetchingModels(true);
        setTestError(null);

        try {
            const result = await api.fetchLocalModels(baseUrl, bridgeToken);
            if (result.success && result.models) {
                const formattedModels = result.models.map((m: string) => ({
                    id: m,
                    name: m,
                    description: 'Local model',
                }));
                setLocalModels(formattedModels);
                if (formattedModels.length > 0) {
                    setSelectedModel(formattedModels[0]!.id);
                }
            } else {
                setTestError(result.message || 'Failed to fetch models');
            }
        } catch (err) {
            setTestError(err instanceof Error ? err.message : 'Failed to fetch models');
        } finally {
            setFetchingModels(false);
        }
    };

    const handleTestConnection = async () => {
        if (isLocalProvider) {
            if (!baseUrl || baseUrlError || !bridgeToken || tokenError || !selectedModel) return;
        } else {
            if (!apiKey || validationError) return;
        }

        setTestStatus('testing');
        setTestError(null);

        try {
            let result;
            if (isLocalProvider) {
                result = await api.testLocalConnection(baseUrl, bridgeToken, selectedModel);
            } else {
                result = await api.testConnection(
                    selectedProvider,
                    apiKey,
                    selectedModel,
                    isGoogleProvider ? location : undefined
                );
            }

            if (result.success) {
                setTestStatus('success');
            } else {
                setTestStatus('error');
                setTestError(result.message || 'Connection test failed');
            }
        } catch (err) {
            setTestStatus('error');
            setTestError(err instanceof Error ? err.message : 'Connection test failed');
        }
    };

    const handleSave = () => {
        if (isLocalProvider) {
            if (!baseUrl || baseUrlError || !bridgeToken || tokenError || !selectedModel) return;

            store.setProvider(selectedProvider);
            store.setModel(selectedModel);
            store.setLocalConfig(baseUrl, bridgeToken);
            store.setAdvancedSettings(temperature, maxTokens);
        } else {
            if (!apiKey || validationError) return;

            store.setProvider(selectedProvider);
            store.setModel(selectedModel);
            store.setApiKey(apiKey);
            store.setAdvancedSettings(temperature, maxTokens);
            if (isGoogleProvider) {
                store.setLocation(location);
            }
        }
        onSave();
    };

    const canTestConnection = isLocalProvider
        ? !!(baseUrl && !baseUrlError && bridgeToken && !tokenError && selectedModel)
        : !!(apiKey && !validationError);

    const canSave = isLocalProvider
        ? !!(baseUrl && !baseUrlError && bridgeToken && !tokenError && selectedModel)
        : !!(apiKey && !validationError);

    if (!isOpen) return null;

    const selectedModelData = models.find((m) => m.id === selectedModel);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-gray-900 to-[#0a0a0f] shadow-2xl">
                <div className="from-primary/5 to-accent/5 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />

                <div className="relative p-6">
                    <div className="mb-6 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="border-primary/40 bg-primary/15 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-glow">
                                <Key className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    Configure AI Provider
                                </h2>
                                <p className="text-sm text-gray-400">
                                    Connect your API key to generate courses
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                                <Cpu className="h-4 w-4 text-primary" />
                                Select Provider
                            </label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {LLM_PROVIDERS.slice(0, 4).map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProvider(p.id)}
                                        className={`group relative rounded-xl border p-3 transition-all duration-200 ${
                                            selectedProvider === p.id
                                                ? 'bg-primary/15 border-primary shadow-glow'
                                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="mb-2 flex h-6 items-center">
                                            {p.logoUrl ? (
                                                <img
                                                    src={p.logoUrl}
                                                    alt={p.name}
                                                    className="h-5 w-5 object-contain"
                                                />
                                            ) : (
                                                <span className="text-xl">{p.icon}</span>
                                            )}
                                        </div>
                                        <div className="truncate text-xs font-bold text-white">
                                            {p.name}
                                        </div>
                                        {selectedProvider === p.id && (
                                            <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-gray-900 bg-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {LLM_PROVIDERS.slice(4).map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProvider(p.id)}
                                        className={`group relative rounded-xl border p-3 transition-all duration-200 ${
                                            selectedProvider === p.id
                                                ? 'bg-primary/15 border-primary shadow-glow'
                                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="mb-2 flex h-6 items-center">
                                            {p.logoUrl ? (
                                                <img
                                                    src={p.logoUrl}
                                                    alt={p.name}
                                                    className="h-5 w-5 object-contain"
                                                />
                                            ) : (
                                                <span className="text-xl">{p.icon}</span>
                                            )}
                                        </div>
                                        <div className="truncate text-xs font-bold text-white">
                                            {p.name}
                                        </div>
                                        {selectedProvider === p.id && (
                                            <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-gray-900 bg-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {provider && !isLocalProvider && (
                            <a
                                href={provider.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-primary-hover"
                            >
                                <Sparkles className="h-4 w-4" />
                                Get your {provider.name} API key
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}

                        {/* Local LLM Setup Instructions */}
                        {isLocalProvider && (
                            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <Terminal className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium text-gray-300">
                                        Quick Setup
                                    </span>
                                </div>
                                <div className="space-y-2 text-xs text-gray-400">
                                    <p>1. Install the bridge CLI:</p>
                                    <code className="block break-all rounded-lg bg-black/40 p-2 font-mono text-[11px] text-primary">
                                        pip install
                                        git+https://github.com/Algozenith/circuit-forge.git#subdirectory=cli
                                    </code>
                                    <p>
                                        2. Run{' '}
                                        <code className="text-primary">circuitforge-bridge</code>{' '}
                                        and paste the URL &amp; token below
                                    </p>
                                </div>
                                <a
                                    href={provider.docsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover"
                                >
                                    View full setup guide
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        )}

                        {/* Cloud Provider: API Key + Model */}
                        {!isLocalProvider && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-300">
                                        API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showKey ? 'text' : 'password'}
                                            value={apiKey}
                                            onChange={(e) => handleApiKeyChange(e.target.value)}
                                            placeholder={
                                                provider?.keyPrefix
                                                    ? `${provider.keyPrefix}...`
                                                    : 'Paste your API key'
                                            }
                                            className={`focus:ring-primary/50 w-full rounded-xl border bg-black/40 px-4 py-3 pr-12 text-white placeholder-gray-500 outline-none transition-all focus:border-primary focus:ring-2 ${
                                                validationError
                                                    ? 'border-red-500/50'
                                                    : 'border-white/10'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKey(!showKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                                        >
                                            {showKey ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-1.5 flex h-4 items-center gap-1 text-xs text-red-400">
                                        {validationError && (
                                            <>
                                                <AlertCircle className="h-3 w-3" />
                                                {validationError}
                                            </>
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-300">
                                        Model
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="focus:ring-primary/50 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition-all focus:border-primary focus:ring-2"
                                        >
                                            {models.map((m) => (
                                                <option
                                                    key={m.id}
                                                    value={m.id}
                                                    className="bg-gray-900"
                                                >
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <p className="mt-1.5 h-4 truncate text-xs text-gray-500">
                                        {selectedModelData?.description || ''}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Google Vertex AI: Location/Region (express mode) */}
                        {!isLocalProvider && isGoogleProvider && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Location / Region
                                </label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => {
                                        setLocation(e.target.value);
                                        setTestStatus('idle');
                                        setTestError(null);
                                    }}
                                    placeholder="global"
                                    className="focus:ring-primary/50 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-primary focus:ring-2"
                                />
                                <p className="mt-1.5 h-4 truncate text-xs text-gray-500">
                                    Vertex AI region (e.g. us-central1) or &quot;global&quot;
                                </p>
                            </div>
                        )}

                        {/* Local Provider: Base URL + Token + Model */}
                        {isLocalProvider && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-300">
                                            Tunnel URL
                                        </label>
                                        <input
                                            type="text"
                                            value={baseUrl}
                                            onChange={(e) => handleBaseUrlChange(e.target.value)}
                                            placeholder="https://xxx.trycloudflare.com"
                                            className={`focus:ring-primary/50 w-full rounded-xl border bg-black/40 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-primary focus:ring-2 ${
                                                baseUrlError
                                                    ? 'border-red-500/50'
                                                    : 'border-white/10'
                                            }`}
                                        />
                                        <p className="mt-1.5 flex h-4 items-center gap-1 text-xs text-red-400">
                                            {baseUrlError && (
                                                <>
                                                    <AlertCircle className="h-3 w-3" />
                                                    {baseUrlError}
                                                </>
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-300">
                                            Bridge Token
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showKey ? 'text' : 'password'}
                                                value={bridgeToken}
                                                onChange={(e) => handleTokenChange(e.target.value)}
                                                placeholder="Paste token from CLI"
                                                className={`focus:ring-primary/50 w-full rounded-xl border bg-black/40 px-4 py-3 pr-12 text-white placeholder-gray-500 outline-none transition-all focus:border-primary focus:ring-2 ${
                                                    tokenError
                                                        ? 'border-red-500/50'
                                                        : 'border-white/10'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowKey(!showKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                                            >
                                                {showKey ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="mt-1.5 flex h-4 items-center gap-1 text-xs text-red-400">
                                            {tokenError && (
                                                <>
                                                    <AlertCircle className="h-3 w-3" />
                                                    {tokenError}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleFetchModels}
                                        disabled={
                                            !baseUrl ||
                                            !!baseUrlError ||
                                            !bridgeToken ||
                                            !!tokenError ||
                                            fetchingModels
                                        }
                                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {fetchingModels ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                        Fetch Models
                                    </button>

                                    {localModels.length > 0 && (
                                        <div className="flex-1">
                                            <div className="relative">
                                                <select
                                                    value={selectedModel}
                                                    onChange={(e) =>
                                                        setSelectedModel(e.target.value)
                                                    }
                                                    className="focus:ring-primary/50 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none transition-all focus:border-primary focus:ring-2"
                                                >
                                                    {localModels.map((m) => (
                                                        <option
                                                            key={m.id}
                                                            value={m.id}
                                                            className="bg-gray-900"
                                                        >
                                                            {m.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {localModels.length === 0 &&
                                    baseUrl &&
                                    bridgeToken &&
                                    !fetchingModels && (
                                        <p className="text-xs text-gray-500">
                                            Click &quot;Fetch Models&quot; to load available models
                                            from your local LLM server
                                        </p>
                                    )}
                            </div>
                        )}

                        <button
                            onClick={handleTestConnection}
                            disabled={!canTestConnection || testStatus === 'testing'}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all ${
                                testStatus === 'success'
                                    ? 'border border-green-500/50 bg-green-500/20 text-green-300'
                                    : testStatus === 'error'
                                      ? 'border border-red-500/50 bg-red-500/20 text-red-300'
                                      : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50'
                            }`}
                        >
                            {testStatus === 'testing' && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            {testStatus === 'success' && <CheckCircle className="h-4 w-4" />}
                            {testStatus === 'error' && <AlertCircle className="h-4 w-4" />}
                            {testStatus === 'testing'
                                ? 'Testing Connection...'
                                : testStatus === 'success'
                                  ? 'Connection Successful!'
                                  : testStatus === 'error'
                                    ? 'Connection Failed'
                                    : 'Test Connection'}
                        </button>
                        {testStatus === 'error' && testError && (
                            <p className="-mt-4 text-center text-xs text-red-400">{testError}</p>
                        )}

                        <div className="border-t border-white/10 pt-4">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
                            >
                                {showAdvanced ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                                Advanced Settings
                            </button>

                            {showAdvanced && (
                                <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-white/5 bg-black/20 p-4">
                                    <div>
                                        <label className="mb-2 block text-xs font-medium text-gray-400">
                                            Temperature:{' '}
                                            <span className="text-primary">{temperature}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="2"
                                            step="0.1"
                                            value={temperature}
                                            onChange={(e) =>
                                                setTemperature(parseFloat(e.target.value))
                                            }
                                            className="w-full accent-primary"
                                        />
                                        <p className="mt-1 text-[10px] text-gray-600">
                                            Lower = focused, Higher = creative
                                        </p>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-medium text-gray-400">
                                            Max Tokens:{' '}
                                            <span className="text-primary">{maxTokens}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1000"
                                            max="16000"
                                            step="500"
                                            value={maxTokens}
                                            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                            className="w-full accent-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-gray-300 transition-colors hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!canSave}
                                className="gradient-btn flex-1 rounded-xl py-3 font-medium shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Save & Continue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
