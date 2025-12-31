# Implementation Plan: User LLM API Keys

## Overview

This implementation adds support for user-provided LLM API keys from multiple providers (OpenAI, Anthropic, Google, OHMYGPT, MEGALLM, AGENTROUTER, OPENROUTER). The backend uses the Strategy pattern for provider abstraction, and the frontend uses a modal-first UX with session storage for API keys.

## Tasks

- [x] 1. Create provider strategy infrastructure (Backend)
  - [x] 1.1 Create LLM provider models and base strategy
    - Create `backend/app/services/llm_providers.py` with `LLMRequest`, `LLMResponse`, and `LLMProviderStrategy` abstract base class
    - Define error classes: `LLMError`, `AuthenticationError`, `RateLimitError`, `QuotaExceededError`
    - _Requirements: 6.1, 6.5_
  - [x] 1.2 Implement OpenAI-compatible strategy
    - Create `OpenAICompatibleStrategy` class with configurable base_url and key_prefix
    - Implement `call()` method using chat/completions format with tools
    - Implement `validate_key_format()` method
    - _Requirements: 6.2, 2.2_
  - [x] 1.3 Implement Anthropic strategy
    - Create `AnthropicStrategy` class for Claude API
    - Implement `call()` method using messages API with tool_use
    - Handle Anthropic-specific response format
    - _Requirements: 6.3_
  - [x] 1.4 Implement Google strategy
    - Create `GoogleStrategy` class for Gemini API
    - Implement `call()` method using generateContent with functionDeclarations
    - Handle Google-specific response format
    - _Requirements: 6.4_
  - [x] 1.5 Write property test for OpenAI-compatible request format
    - **Property 3: OpenAI-Compatible Providers Use Chat Completions Format**
    - **Validates: Requirements 1.5, 6.2**

- [x] 2. Create provider factory and update LLM service (Backend)
  - [x] 2.1 Create provider factory
    - Create `backend/app/services/llm_provider_factory.py`
    - Register all providers with their configurations (base URLs, key prefixes)
    - Implement `get_provider()` method for runtime selection
    - _Requirements: 6.6_
  - [x] 2.2 Update LLM service to use user-provided keys
    - Modify `LLMService` to accept provider_id, api_key, model as parameters
    - Remove server-side API key configuration dependency
    - Use factory to get provider strategy at runtime
    - _Requirements: 5.1, 5.2_
  - [x] 2.3 Write property test for response normalization
    - **Property 4: Response Normalization Without API Key Exposure**
    - **Validates: Requirements 5.6, 6.5**

- [x] 3. Update API endpoints (Backend)
  - [x] 3.1 Update course generation request model
    - Add `provider`, `api_key`, `model`, `temperature`, `max_tokens` fields to `GeneratePlanRequest`
    - Ensure API key is not logged or persisted
    - _Requirements: 4.2, 4.3, 4.4_
  - [x] 3.2 Add test connection endpoint
    - Create `/courses/test-connection` POST endpoint
    - Accept provider, api_key, model and make a minimal API call
    - Return success/failure with appropriate error messages
    - _Requirements: 8.5_
  - [x] 3.3 Update error handling for LLM errors
    - Map `AuthenticationError` to 401 response
    - Map `RateLimitError` to 429 response with retry-after
    - Map `QuotaExceededError` to 402 response
    - _Requirements: 5.3, 5.4, 5.5, 8.1_
  - [x] 3.4 Write property test for API key format validation
    - **Property 2: API Key Format Validation with Provider-Specific Errors**
    - **Validates: Requirements 2.2, 8.2**

- [x] 4. Checkpoint - Backend complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 5. Create frontend provider configuration (Frontend)
  - [x] 5.1 Create provider configuration constants
    - Create `frontend/src/constants/llmProviders.ts`
    - Define `LLMProvider` and `ModelOption` types
    - Add all 7 providers with their models, icons, and docs URLs
    - _Requirements: 1.3, 3.1, 3.2, 3.3, 3.4_
  - [x] 5.2 Write property test for provider configuration
    - **Property 5: All Providers Have Documentation URLs**
    - **Validates: Requirements 7.3**
  - [x] 5.3 Write property test for default model selection
    - **Property 1: Provider Selection Displays Correct Models with Default**
    - **Validates: Requirements 1.2, 3.5**

- [x] 6. Create LLM config store (Frontend)
  - [x] 6.1 Create Zustand store for LLM configuration
    - Create `frontend/src/stores/llmConfigStore.ts`
    - Implement session storage for API key (cleared on tab close)
    - Implement local storage for provider/model preferences (persisted)
    - Add `isConfigured()` helper method
    - _Requirements: 2.5, 7.7, 7.8_

- [x] 7. Create API Key Modal component (Frontend)
  - [x] 7.1 Create APIKeyModal component
    - Create `frontend/src/components/ui/APIKeyModal.tsx`
    - Implement provider selection with icons
    - Implement masked API key input field
    - Implement model selection dropdown
    - Add links to provider documentation pages
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 7.3_
  - [x] 7.2 Add test connection functionality to modal
    - Add "Test Connection" button
    - Call backend test-connection endpoint
    - Show success/error feedback
    - _Requirements: 8.5_
  - [x] 7.3 Add advanced settings toggle
    - Add collapsible section for temperature and max tokens
    - Use sensible defaults
    - _Requirements: 3.6_

- [x] 8. Update course creation page (Frontend)
  - [x] 8.1 Integrate API key modal into course creation page
    - Show modal on page load if no API key configured
    - Block course creation until API key provided
    - Add settings button to reopen modal
    - _Requirements: 7.1, 7.2, 7.4, 7.6_
  - [x] 8.2 Update API calls to include LLM config
    - Pass provider, api_key, model to generate-plan endpoint
    - Handle LLM-specific errors with appropriate messages
    - Preserve topic input on error for retry
    - _Requirements: 5.1, 8.4_
  - [x] 8.3 Add API key status indicator
    - Show masked indicator when key is configured
    - Show provider name and model
    - _Requirements: 7.5_

- [x] 9. Update frontend API service (Frontend)
  - [x] 9.1 Update api.ts with new endpoint signatures
    - Update `generateCoursePlan()` to accept LLM config
    - Add `testConnection()` method
    - _Requirements: 5.1, 8.5_

- [x] 10. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All property-based tests are required for comprehensive coverage
- API keys are NEVER stored on the server - passed per-request only
- Session storage clears API key when tab closes (browser behavior)
- Local storage persists provider/model preferences across sessions
- All OpenAI-compatible providers (OHMYGPT, MEGALLM, AGENTROUTER, OPENROUTER) use the same strategy with different base URLs
