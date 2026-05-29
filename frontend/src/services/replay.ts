/**
 * REST API client for time-travel replay endpoints.
 *
 * Two endpoints exposed by Story C backend:
 *   GET  /api/sessions/{code}/events?from_seq=&to_seq=
 *   POST /api/sessions/{code}/branch?from_seq=N
 */

import { extractTraceFromResponse, getTracingHeaders, logErrorWithTrace } from '@/utils/tracing';

import type { CircuitEvent, CircuitState } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface EventsSliceResponse {
    events: CircuitEvent[];
    snapshot: { seq: number; state: CircuitState } | null;
}

export interface BranchResponse {
    code: string;
    participantId: string;
}

async function request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...getTracingHeaders(),
            ...init.headers,
        },
    });

    const { traceId, requestId } = extractTraceFromResponse(response);

    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
            const data = await response.json();
            if (data?.detail?.error?.message) errorMessage = data.detail.error.message;
            else if (data?.error?.message) errorMessage = data.error.message;
            else if (data?.detail) {
                errorMessage =
                    typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
            }
        } catch {
            // body wasn't JSON; keep the status-line fallback above.
        }
        logErrorWithTrace(
            `Replay API request failed: ${endpoint}`,
            errorMessage,
            traceId,
            requestId
        );
        throw new Error(errorMessage);
    }

    return response.json();
}

export async function fetchEvents(
    code: string,
    fromSeq: number,
    toSeq: number
): Promise<EventsSliceResponse> {
    const params = new URLSearchParams({
        from_seq: String(fromSeq),
        to_seq: String(toSeq),
    });
    return request<EventsSliceResponse>(
        `/sessions/${code.toUpperCase()}/events?${params.toString()}`
    );
}

export async function branchSession(code: string, fromSeq: number): Promise<BranchResponse> {
    const params = new URLSearchParams({ from_seq: String(fromSeq) });
    return request<BranchResponse>(`/sessions/${code.toUpperCase()}/branch?${params.toString()}`, {
        method: 'POST',
    });
}
