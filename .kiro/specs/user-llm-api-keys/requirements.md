# Requirements Document

## Introduction

This feature enables users to provide their own LLM API keys from various providers (OpenAI, Anthropic/Claude, Google Gemini, etc.) to generate circuit courses. CircuitForge acts as a platform that provides tools for LLMs to create circuits and learning content, rather than providing LLM access itself. Users bring their own API keys, which are used only for the duration of the request and are never stored on the server.

## Glossary

- **LLM_Provider**: A service that provides Large Language Model APIs (e.g., OpenAI, Anthropic, Google)
- **API_Key**: A secret credential provided by an LLM provider to authenticate API requests
- **Course_Generator**: The system component that uses LLM APIs to generate circuit course content
- **Provider_Config**: Configuration settings specific to each LLM provider (base URL, model names, etc.)
- **Session_Key**: An API key provided by the user for a single session, stored only in browser memory

## Requirements

### Requirement 1: LLM Provider Selection

**User Story:** As a user, I want to select my preferred LLM provider, so that I can use the AI service I have access to.

#### Acceptance Criteria

1. WHEN a user visits the course creation page, THE Course_Generator SHALL display a provider selection interface with supported providers
2. WHEN a user selects a provider, THE Course_Generator SHALL display the appropriate API key input field and model options for that provider
3. THE Course_Generator SHALL support the following providers: OpenAI, Anthropic (Claude), Google (Gemini), OHMYGPT, MEGALLM, AGENTROUTER, and OPENROUTER
4. WHEN displaying provider options, THE Course_Generator SHALL show provider logos/icons and names for easy identification
5. WHEN a user selects an OpenAI-compatible provider (OHMYGPT, MEGALLM, AGENTROUTER), THE Course_Generator SHALL use the OpenAI API format with the provider's base URL

### Requirement 2: API Key Input and Validation

**User Story:** As a user, I want to enter my API key securely, so that I can authenticate with my chosen LLM provider.

#### Acceptance Criteria

1. WHEN a user enters an API key, THE Course_Generator SHALL mask the input field to prevent shoulder surfing
2. WHEN a user submits an API key, THE Course_Generator SHALL validate the key format before making API calls
3. IF an API key validation fails, THEN THE Course_Generator SHALL display a clear error message indicating the issue
4. THE Course_Generator SHALL NOT store API keys on the server or in any persistent storage
5. WHEN a user provides an API key, THE Course_Generator SHALL store it only in browser session memory
6. WHEN the browser tab is closed, THE Course_Generator SHALL clear the API key from memory

### Requirement 3: Provider-Specific Configuration

**User Story:** As a user, I want to configure provider-specific settings, so that I can use my preferred model and settings.

#### Acceptance Criteria

1. WHEN a user selects OpenAI, THE Course_Generator SHALL offer model options including gpt-4o, gpt-4-turbo, and gpt-3.5-turbo
2. WHEN a user selects Anthropic, THE Course_Generator SHALL offer model options including claude-3-5-sonnet, claude-3-opus, and claude-3-haiku
3. WHEN a user selects Google, THE Course_Generator SHALL offer model options including gemini-1.5-pro and gemini-1.5-flash
4. WHEN a user selects OHMYGPT, MEGALLM, AGENTROUTER, or OPENROUTER, THE Course_Generator SHALL offer popular models available through those aggregators (gpt-4o, claude-3-5-sonnet, etc.)
5. THE Course_Generator SHALL provide sensible default model selections for each provider
6. WHERE advanced settings are enabled, THE Course_Generator SHALL allow users to configure temperature and max tokens

### Requirement 4: API Key Transmission Security

**User Story:** As a user, I want my API key transmitted securely, so that it cannot be intercepted by malicious actors.

#### Acceptance Criteria

1. WHEN transmitting an API key to the backend, THE Course_Generator SHALL use HTTPS encryption
2. THE Course_Generator SHALL send API keys only in request bodies, never in URLs or query parameters
3. WHEN the backend receives an API key, THE Course_Generator SHALL use it only for the current request and discard it immediately after
4. THE Course_Generator SHALL NOT log API keys in any server logs or monitoring systems

### Requirement 5: Course Generation with User API Key

**User Story:** As a user, I want to generate courses using my own API key, so that I can create personalized learning content.

#### Acceptance Criteria

1. WHEN a user initiates course generation with a valid API key, THE Course_Generator SHALL use that key to call the selected provider's API
2. WHEN generating course content, THE Course_Generator SHALL pass the appropriate system prompts and tool definitions to the LLM
3. IF the LLM API call fails due to invalid credentials, THEN THE Course_Generator SHALL return a clear authentication error to the user
4. IF the LLM API call fails due to rate limiting, THEN THE Course_Generator SHALL inform the user about the rate limit and suggest waiting
5. IF the LLM API call fails due to insufficient quota, THEN THE Course_Generator SHALL inform the user about their quota status
6. WHEN course generation succeeds, THE Course_Generator SHALL return the generated content without exposing any API key information

### Requirement 6: Provider API Compatibility

**User Story:** As a developer, I want the system to handle different provider APIs uniformly, so that adding new providers is straightforward.

#### Acceptance Criteria

1. THE Course_Generator SHALL implement a provider abstraction using the Strategy pattern to normalize different API formats
2. WHEN calling OpenAI-compatible APIs (OpenAI, OHMYGPT, MEGALLM, AGENTROUTER, OPENROUTER), THE Course_Generator SHALL use the chat completions format with tool calling
3. WHEN calling Anthropic APIs, THE Course_Generator SHALL use the messages API format with tool use
4. WHEN calling Google APIs, THE Course_Generator SHALL use the generateContent format with function calling
5. THE Course_Generator SHALL handle provider-specific response formats and normalize them to a common structure
6. THE Course_Generator SHALL use dependency injection to allow provider implementations to be swapped at runtime based on user selection

### Requirement 7: User Experience for API Key Management

**User Story:** As a user, I want a smooth experience managing my API key, so that I can easily start creating courses.

#### Acceptance Criteria

1. WHEN a user visits the course creation page without a configured API key, THE Course_Generator SHALL display a modal requiring API key configuration before proceeding
2. THE Course_Generator SHALL block access to course creation functionality until a valid API key is provided via the modal
3. THE Course_Generator SHALL provide links to each provider's API key creation page within the modal
4. WHEN a user successfully configures an API key, THE Course_Generator SHALL close the modal and enable course creation
5. WHEN a user's API key is configured for the session, THE Course_Generator SHALL show a masked indicator in the UI that a key is active
6. WHEN a user wants to change their API key, THE Course_Generator SHALL provide a settings button to reopen the configuration modal
7. THE Course_Generator SHALL store the API key only in browser session storage (cleared when tab closes)
8. THE Course_Generator SHALL remember the user's provider and model preferences in local storage (persisted across sessions, but not the API key)

### Requirement 8: Error Handling and Feedback

**User Story:** As a user, I want clear feedback when something goes wrong, so that I can understand and resolve issues.

#### Acceptance Criteria

1. IF the selected provider's API is unavailable, THEN THE Course_Generator SHALL display a service unavailability message
2. IF the API key format is invalid for the selected provider, THEN THE Course_Generator SHALL display a format-specific error message
3. IF the model selected is not available for the user's API key tier, THEN THE Course_Generator SHALL suggest alternative models
4. WHEN an error occurs during generation, THE Course_Generator SHALL preserve the user's topic input for retry
5. THE Course_Generator SHALL provide a "Test Connection" button to verify API key validity before starting generation
