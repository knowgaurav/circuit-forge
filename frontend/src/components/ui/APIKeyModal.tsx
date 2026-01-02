'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink, Eye, EyeOff, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle, Key, Cpu, Sparkles, Home, Terminal, RefreshCw } from 'lucide-react';
import { LLM_PROVIDERS, getProvider, validateKeyFormat, validateBaseUrl, validateBridgeToken } from '@/constants/llmProviders';
import { useLLMConfigStore } from '@/stores/llmConfigStore';
import { api } from '@/services/api';

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

    // Local LLM specific state
    const [baseUrl, setBaseUrl] = useState('');
    const [bridgeToken, setBridgeToken] = useState('');
    const [baseUrlError, setBaseUrlError] = useState<string | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [localModels, setLocalModels] = useState<Array<{ id: string; name: string; description: string }>>([]);
    const [fetchingModels, setFetchingModels] = useState(false);

    const provider = getProvider(selectedProvider);
    const isLocalProvider = provider?.requiresBaseUrl === true;
    const models = isLocalProvider ? localModels : (provider?.models || []);

    useEffect(() => {
        if (isOpen) {
            setSelectedProvider(store.provider);
            setSelectedModel(store.model);
            setApiKey('');
            setTemperature(store.temperature);
            setMaxTokens(store.maxTokens);
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
    }, [isOpen, store.provider, store.model, store.temperature, store.maxTokens]);

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
                const defaultModel = newProvider.models.find(m => m.isDefault) || newProvider.models[0];
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
                    setSelectedModel(formattedModels[0].id);
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
                result = await api.testConnection(selectedProvider, apiKey, selectedModel);
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

    const selectedModelData = models.find(m => m.id === selectedModel);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-gradient-to-b from-gray-900 to-[#0a0a0f] rounded-3xl border border-white/10 shadow-2xl shadow-brand-500/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-blue-500/5 pointer-events-none" />
                
                <div className="relative p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                                <Key className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Configure AI Provider</h2>
                                <p className="text-sm text-gray-400">Connect your API key to generate courses</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                                <Cpu className="w-4 h-4 text-brand-400" />
                                Select Provider
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {LLM_PROVIDERS.slice(0, 4).map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProvider(p.id)}
                                        className={`group relative p-3 rounded-xl border transition-all duration-200 ${
                                            selectedProvider === p.id
                                                ? 'border-brand-500 bg-brand-500/20 shadow-lg shadow-brand-500/20'
                                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="h-6 mb-2 flex items-center">
                                            {p.logoUrl ? (
                                                <img src={p.logoUrl} alt={p.name} className="h-5 w-5 object-contain" />
                                            ) : (
                                                <span className="text-xl">{p.icon}</span>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-white truncate">{p.name}</div>
                                        {selectedProvider === p.id && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-gray-900" />
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {LLM_PROVIDERS.slice(4).map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProvider(p.id)}
                                        className={`group relative p-3 rounded-xl border transition-all duration-200 ${
                                            selectedProvider === p.id
                                                ? 'border-brand-500 bg-brand-500/20 shadow-lg shadow-brand-500/20'
                                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="h-6 mb-2 flex items-center">
                                            {p.logoUrl ? (
                                                <img src={p.logoUrl} alt={p.name} className="h-5 w-5 object-contain" />
                                            ) : (
                                                <span className="text-xl">{p.icon}</span>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-white truncate">{p.name}</div>
                                        {selectedProvider === p.id && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-gray-900" />
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
                                className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-purple-300 transition-colors"
                            >
                                <Sparkles className="w-4 h-4" />
                                Get your {provider.name} API key
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}

                        {/* Local LLM Setup Instructions */}
                        {isLocalProvider && (
                            <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Terminal className="w-4 h-4 text-brand-400" />
                                    <span className="text-sm font-medium text-gray-300">Quick Setup</span>
                                </div>
                                <div className="space-y-2 text-xs text-gray-400">
                                    <p>1. Install the bridge CLI:</p>
                                    <code className="block p-2 bg-black/40 rounded-lg text-brand-300 font-mono text-[11px] break-all">
                                        pip install git+https://github.com/Algozenith/circuit-forge.git#subdirectory=cli
                                    </code>
                                    <p>2. Run <code className="text-brand-300">circuitforge-bridge</code> and paste the URL &amp; token below</p>
                                </div>
                                <a
                                    href={provider.docsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-3 text-xs text-brand-400 hover:text-purple-300"
                                >
                                    View full setup guide
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}

                        {/* Cloud Provider: API Key + Model */}
                        {!isLocalProvider && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showKey ? 'text' : 'password'}
                                            value={apiKey}
                                            onChange={(e) => handleApiKeyChange(e.target.value)}
                                            placeholder={provider?.keyPrefix ? `${provider.keyPrefix}...` : 'Paste your API key'}
                                            className={`w-full px-4 py-3 pr-12 bg-black/40 border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all ${
                                                validationError ? 'border-red-500/50' : 'border-white/10'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKey(!showKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1 h-4">
                                        {validationError && (
                                            <>
                                                <AlertCircle className="w-3 h-3" />
                                                {validationError}
                                            </>
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Model
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none appearance-none cursor-pointer transition-all"
                                        >
                                            {models.map((m) => (
                                                <option key={m.id} value={m.id} className="bg-gray-900">
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                    <p className="mt-1.5 text-xs text-gray-500 h-4 truncate">
                                        {selectedModelData?.description || ''}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Local Provider: Base URL + Token + Model */}
                        {isLocalProvider && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Tunnel URL
                                        </label>
                                        <input
                                            type="text"
                                            value={baseUrl}
                                            onChange={(e) => handleBaseUrlChange(e.target.value)}
                                            placeholder="https://xxx.trycloudflare.com"
                                            className={`w-full px-4 py-3 bg-black/40 border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all ${
                                                baseUrlError ? 'border-red-500/50' : 'border-white/10'
                                            }`}
                                        />
                                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1 h-4">
                                            {baseUrlError && (
                                                <>
                                                    <AlertCircle className="w-3 h-3" />
                                                    {baseUrlError}
                                                </>
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Bridge Token
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showKey ? 'text' : 'password'}
                                                value={bridgeToken}
                                                onChange={(e) => handleTokenChange(e.target.value)}
                                                placeholder="Paste token from CLI"
                                                className={`w-full px-4 py-3 pr-12 bg-black/40 border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all ${
                                                    tokenError ? 'border-red-500/50' : 'border-white/10'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowKey(!showKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1 h-4">
                                            {tokenError && (
                                                <>
                                                    <AlertCircle className="w-3 h-3" />
                                                    {tokenError}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleFetchModels}
                                        disabled={!baseUrl || !!baseUrlError || !bridgeToken || !!tokenError || fetchingModels}
                                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                    >
                                        {fetchingModels ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-4 h-4" />
                                        )}
                                        Fetch Models
                                    </button>

                                    {localModels.length > 0 && (
                                        <div className="flex-1">
                                            <div className="relative">
                                                <select
                                                    value={selectedModel}
                                                    onChange={(e) => setSelectedModel(e.target.value)}
                                                    className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none appearance-none cursor-pointer transition-all text-sm"
                                                >
                                                    {localModels.map((m) => (
                                                        <option key={m.id} value={m.id} className="bg-gray-900">
                                                            {m.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {localModels.length === 0 && baseUrl && bridgeToken && !fetchingModels && (
                                    <p className="text-xs text-gray-500">
                                        Click &quot;Fetch Models&quot; to load available models from your local LLM server
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleTestConnection}
                            disabled={!canTestConnection || testStatus === 'testing'}
                            className={`w-full px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                                testStatus === 'success'
                                    ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                                    : testStatus === 'error'
                                    ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                        >
                            {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {testStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                            {testStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                            {testStatus === 'testing' ? 'Testing Connection...' : testStatus === 'success' ? 'Connection Successful!' : testStatus === 'error' ? 'Connection Failed' : 'Test Connection'}
                        </button>
                        {testStatus === 'error' && testError && (
                            <p className="text-xs text-red-400 text-center -mt-4">{testError}</p>
                        )}

                        <div className="border-t border-white/10 pt-4">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                Advanced Settings
                            </button>

                            {showAdvanced && (
                                <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-black/20 rounded-xl border border-white/5">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-2">
                                            Temperature: <span className="text-brand-400">{temperature}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="2"
                                            step="0.1"
                                            value={temperature}
                                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                            className="w-full accent-brand-500"
                                        />
                                        <p className="text-[10px] text-gray-600 mt-1">Lower = focused, Higher = creative</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-2">
                                            Max Tokens: <span className="text-brand-400">{maxTokens}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1000"
                                            max="16000"
                                            step="500"
                                            value={maxTokens}
                                            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                            className="w-full accent-brand-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 border border-white/10 rounded-xl text-gray-300 hover:bg-white/5 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!canSave}
                                className="flex-1 gradient-btn py-3 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25"
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
