/**
 * REST API client for CircuitForge backend
 */

import type {
    CircuitState,
    CoursePlan,
    CourseEnrollment,
    LevelContent,
    MyCourseItem,
    Participant,
    TopicSuggestion,
    ValidationResult
} from '@/types';
import type { LLMConfig } from '@/stores/llmConfigStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';



class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            let errorMessage = 'An unknown error occurred';
            try {
                const errorData = await response.json();
                // Handle both {error: {message}} and {detail: {error: {message}}} formats
                if (errorData?.detail?.error?.message) {
                    errorMessage = errorData.detail.error.message;
                } else if (errorData?.error?.message) {
                    errorMessage = errorData.error.message;
                } else if (errorData?.detail) {
                    errorMessage = typeof errorData.detail === 'string'
                        ? errorData.detail
                        : JSON.stringify(errorData.detail);
                }
            } catch {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // Session endpoints
    async createSession(): Promise<{ code: string; participantId: string }> {
        return this.request('/sessions', { method: 'POST' });
    }

    async getSession(code: string): Promise<{
        code: string;
        exists: boolean;
        participantCount: number;
    }> {
        return this.request(`/sessions/${code.toUpperCase()}`);
    }

    async joinSession(
        code: string,
        displayName: string,
        participantId?: string
    ): Promise<{ participant: Participant }> {
        return this.request(`/sessions/${code.toUpperCase()}/join`, {
            method: 'POST',
            body: JSON.stringify({
                displayName,
                participantId,
            }),
        });
    }

    async getCircuit(code: string): Promise<CircuitState> {
        return this.request(`/sessions/${code.toUpperCase()}/circuit`);
    }

    async exportJson(code: string): Promise<CircuitState> {
        return this.request(`/sessions/${code.toUpperCase()}/export/json`, {
            method: 'POST',
        });
    }

    async importCircuit(
        code: string,
        circuit: CircuitState
    ): Promise<{ success: boolean; version: number }> {
        return this.request(`/sessions/${code.toUpperCase()}/import`, {
            method: 'POST',
            body: JSON.stringify({ circuit }),
        });
    }

    async closeSession(
        code: string,
        participantId: string
    ): Promise<{ success: boolean }> {
        return this.request(`/sessions/${code.toUpperCase()}/close`, {
            method: 'POST',
            body: JSON.stringify({ participantId }),
        });
    }

    // Course endpoints
    async getTopicSuggestions(): Promise<TopicSuggestion[]> {
        return this.request('/courses/suggestions');
    }

    async generateCoursePlan(
        topic: string,
        llmConfig: LLMConfig,
        participantId?: string
    ): Promise<{ coursePlan: CoursePlan }> {
        const config: Record<string, unknown> = {
            provider: llmConfig.provider,
            apiKey: llmConfig.apiKey,
            model: llmConfig.model,
            temperature: llmConfig.temperature,
            maxTokens: llmConfig.maxTokens,
        };
        
        // Add local LLM specific fields
        if (llmConfig.baseUrl) {
            config.baseUrl = llmConfig.baseUrl;
        }
        if (llmConfig.bridgeToken) {
            config.bridgeToken = llmConfig.bridgeToken;
        }
        
        return this.request('/courses/generate-plan', {
            method: 'POST',
            body: JSON.stringify({
                topic,
                participantId,
                llmConfig: config,
            }),
        });
    }

    async testConnection(
        provider: string,
        apiKey: string,
        model: string
    ): Promise<{ success: boolean; message: string }> {
        return this.request('/courses/test-connection', {
            method: 'POST',
            body: JSON.stringify({
                provider,
                apiKey,
                model,
            }),
        });
    }

    async testLocalConnection(
        baseUrl: string,
        token: string,
        model: string
    ): Promise<{ success: boolean; message: string }> {
        return this.request('/courses/test-local-connection', {
            method: 'POST',
            body: JSON.stringify({
                baseUrl,
                token,
                model,
            }),
        });
    }

    async fetchLocalModels(
        baseUrl: string,
        token: string
    ): Promise<{ success: boolean; models?: string[]; message?: string }> {
        return this.request('/courses/local-models', {
            method: 'POST',
            body: JSON.stringify({
                baseUrl,
                token,
            }),
        });
    }

    async getCoursePlan(courseId: string): Promise<CoursePlan> {
        return this.request(`/courses/${courseId}`);
    }

    async enrollInCourse(
        courseId: string,
        participantId: string
    ): Promise<{ enrollment: CourseEnrollment }> {
        return this.request(`/courses/${courseId}/enroll`, {
            method: 'POST',
            body: JSON.stringify({ participantId }),
        });
    }

    async getLevelContent(
        courseId: string,
        levelNum: number,
        llmConfig: LLMConfig
    ): Promise<{ content: LevelContent | null; isGenerating: boolean }> {
        const config: Record<string, unknown> = {
            provider: llmConfig.provider,
            apiKey: llmConfig.apiKey,
            model: llmConfig.model,
            temperature: llmConfig.temperature,
            maxTokens: llmConfig.maxTokens,
        };
        
        // Add local LLM specific fields
        if (llmConfig.baseUrl) {
            config.baseUrl = llmConfig.baseUrl;
        }
        if (llmConfig.bridgeToken) {
            config.bridgeToken = llmConfig.bridgeToken;
        }
        
        return this.request(`/courses/${courseId}/levels/${levelNum}`, {
            method: 'POST',
            body: JSON.stringify({
                llmConfig: config,
            }),
        });
    }

    async validateCircuit(
        courseId: string,
        levelNum: number,
        circuitState: CircuitState,
        enrollmentId?: string
    ): Promise<ValidationResult> {
        return this.request(`/courses/${courseId}/levels/${levelNum}/validate`, {
            method: 'POST',
            body: JSON.stringify({ circuitState, enrollmentId }),
        });
    }

    async completeLevel(
        courseId: string,
        levelNum: number,
        enrollmentId: string,
        circuitSnapshot?: CircuitState
    ): Promise<{ success: boolean; nextLevel: number | null }> {
        return this.request(`/courses/${courseId}/levels/${levelNum}/complete`, {
            method: 'POST',
            body: JSON.stringify({ enrollmentId, circuitSnapshot }),
        });
    }

    async getMyCourses(participantId: string): Promise<MyCourseItem[]> {
        return this.request(`/courses/my-courses/${participantId}`);
    }
}

export const api = new ApiClient(API_URL);
