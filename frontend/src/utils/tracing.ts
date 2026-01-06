/**
 * Request tracing utilities for end-to-end correlation across services.
 * Generates trace IDs at the origin (frontend) that flow through all backend services.
 */

/**
 * Generate a unique trace ID for correlating requests across services.
 * Format: trace_<16 hex chars>
 */
export function generateTraceId(): string {
  return `trace_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

/**
 * Generate a unique request ID for individual HTTP requests.
 * Format: req_<8 hex chars>
 */
export function generateRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

// Session-level trace ID that persists across requests in the same browser session
let sessionTraceId: string | null = null;

/**
 * Get or create a session-level trace ID.
 * This ID persists for the lifetime of the browser tab/session.
 */
export function getSessionTraceId(): string {
  if (!sessionTraceId) {
    // Try to restore from sessionStorage for tab persistence
    if (typeof window !== 'undefined') {
      sessionTraceId = sessionStorage.getItem('circuitforge_trace_id');
    }
    if (!sessionTraceId) {
      sessionTraceId = generateTraceId();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('circuitforge_trace_id', sessionTraceId);
      }
    }
  }
  return sessionTraceId;
}

/**
 * Get tracing headers to include in API requests.
 * These headers enable end-to-end request correlation.
 */
export function getTracingHeaders(sessionCode?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Trace-ID': getSessionTraceId(),
    'X-Request-ID': generateRequestId(),
    'X-Source': 'frontend',
  };

  if (sessionCode) {
    headers['X-Session-Code'] = sessionCode;
  }

  return headers;
}

/**
 * Extract trace IDs from response headers for logging/debugging.
 */
export function extractTraceFromResponse(response: Response): {
  traceId: string | null;
  requestId: string | null;
} {
  return {
    traceId: response.headers.get('X-Trace-ID'),
    requestId: response.headers.get('X-Request-ID'),
  };
}

/**
 * Log an error with trace context for easier debugging.
 */
export function logErrorWithTrace(
  message: string,
  error: unknown,
  traceId?: string | null,
  requestId?: string | null
): void {
  const traceInfo = traceId || requestId
    ? ` [trace=${traceId || 'unknown'}, request=${requestId || 'unknown'}]`
    : '';
  console.error(`${message}${traceInfo}:`, error);
}
