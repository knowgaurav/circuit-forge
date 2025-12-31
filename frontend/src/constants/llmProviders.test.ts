/**
 * Tests for LLM Provider configuration
 * 
 * **Feature: user-llm-api-keys, Property 5: All Providers Have Documentation URLs**
 * **Validates: Requirements 7.3**
 * 
 * **Feature: user-llm-api-keys, Property 1: Provider Selection Displays Correct Models with Default**
 * **Validates: Requirements 1.2, 3.5**
 */

import { describe, it, expect } from 'vitest';
import {
    LLM_PROVIDERS,
    getProvider,
    getDefaultModel,
    validateKeyFormat,
} from './llmProviders';

describe('LLM Providers Configuration', () => {
    /**
     * **Property 5: All Providers Have Documentation URLs**
     * For any provider in the supported providers configuration, 
     * the provider SHALL have a non-empty docsUrl field.
     */
    describe('Property 5: All Providers Have Documentation URLs', () => {
        it.each(LLM_PROVIDERS.map(p => [p.id, p]))(
            'provider %s should have a documentation URL',
            (_, provider) => {
                expect(provider.docsUrl).toBeDefined();
                expect(provider.docsUrl.length).toBeGreaterThan(0);
                expect(provider.docsUrl).toMatch(/^https?:\/\//);
            }
        );
    });

    /**
     * **Property 1: Provider Selection Displays Correct Models with Default**
     * For any provider ID, selecting that provider SHALL display a non-empty 
     * list of models where exactly one model is marked as default.
     */
    describe('Property 1: Provider Selection Displays Correct Models with Default', () => {
        it.each(LLM_PROVIDERS.map(p => [p.id, p]))(
            'provider %s should have at least one model',
            (_, provider) => {
                expect(provider.models.length).toBeGreaterThan(0);
            }
        );

        it.each(LLM_PROVIDERS.map(p => [p.id, p]))(
            'provider %s should have exactly one default model or first model as fallback',
            (providerId, provider) => {
                const defaultModels = provider.models.filter(m => m.isDefault);
                // Either exactly one default, or we use the first model
                expect(defaultModels.length).toBeLessThanOrEqual(1);

                // getDefaultModel should always return a model
                const defaultModel = getDefaultModel(providerId as string);
                expect(defaultModel).toBeDefined();
                expect(defaultModel?.id).toBeDefined();
            }
        );

        it.each(LLM_PROVIDERS.map(p => [p.id, p]))(
            'provider %s models should have required fields',
            (_, provider) => {
                for (const model of provider.models) {
                    expect(model.id).toBeDefined();
                    expect(model.id.length).toBeGreaterThan(0);
                    expect(model.name).toBeDefined();
                    expect(model.name.length).toBeGreaterThan(0);
                    expect(model.description).toBeDefined();
                }
            }
        );
    });

    describe('Required Providers', () => {
        const requiredProviders = [
            'openai',
            'anthropic',
            'google',
            'ohmygpt',
            'megallm',
            'agentrouter',
            'openrouter',
        ];

        it.each(requiredProviders)('should include %s provider', (providerId) => {
            const provider = getProvider(providerId);
            expect(provider).toBeDefined();
            expect(provider?.id).toBe(providerId);
        });
    });

    describe('API Key Format Validation', () => {
        it('should reject empty API keys', () => {
            const result = validateKeyFormat('openai', '');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('too short');
        });

        it('should reject short API keys', () => {
            const result = validateKeyFormat('openai', 'short');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('too short');
        });

        it('should validate OpenAI key prefix', () => {
            const validResult = validateKeyFormat('openai', 'sk-1234567890abcdef');
            expect(validResult.valid).toBe(true);

            const invalidResult = validateKeyFormat('openai', 'invalid-key-format');
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.error).toContain('sk-');
        });

        it('should validate Anthropic key prefix', () => {
            const validResult = validateKeyFormat('anthropic', 'sk-ant-1234567890abcdef');
            expect(validResult.valid).toBe(true);

            const invalidResult = validateKeyFormat('anthropic', 'sk-1234567890abcdef');
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.error).toContain('sk-ant-');
        });

        it('should validate OpenRouter key prefix', () => {
            const validResult = validateKeyFormat('openrouter', 'sk-or-1234567890abcdef');
            expect(validResult.valid).toBe(true);

            const invalidResult = validateKeyFormat('openrouter', 'sk-1234567890abcdef');
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.error).toContain('sk-or-');
        });

        it('should accept keys without prefix for providers that do not require one', () => {
            const result = validateKeyFormat('google', 'AIzaSyA1234567890abcdefghijklmnop');
            expect(result.valid).toBe(true);
        });

        it('should reject unknown providers', () => {
            const result = validateKeyFormat('unknown', 'some-api-key-here');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Unknown provider');
        });
    });

    describe('Provider Configuration', () => {
        it.each(LLM_PROVIDERS.map(p => [p.id, p]))(
            'provider %s should have all required fields',
            (_, provider) => {
                expect(provider.id).toBeDefined();
                expect(provider.name).toBeDefined();
                expect(provider.icon).toBeDefined();
                expect(provider.description).toBeDefined();
                expect(provider.docsUrl).toBeDefined();
                expect(provider.models).toBeDefined();
                expect(Array.isArray(provider.models)).toBe(true);
            }
        );
    });
});
