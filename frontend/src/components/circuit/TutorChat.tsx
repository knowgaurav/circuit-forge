'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

import { Send, Sparkles, Loader2 } from 'lucide-react';

import { APIKeyModal } from '@/components/ui/APIKeyModal';

import { api } from '@/services/api';
import { useCircuitStore } from '@/stores/circuitStore';
import { useLLMConfigStore } from '@/stores/llmConfigStore';
import { threadKey, useTutorChatStore } from '@/stores/tutorChatStore';

import type { CircuitStore } from '@/stores/circuitStore';
import type { CircuitComponent, CircuitMutation, Position, TutorMode, Wire } from '@/types';

interface TutorChatProps {
    courseId: string;
    levelNumber: number;
    mode: TutorMode;
}

/**
 * Apply the tutor's structural mutations to the local circuit store using the
 * existing store actions only. A `COMPONENT_ADDED` payload carries the label
 * inside `properties.label` (the backend has no top-level label field), so we
 * lift it back onto the component the client store expects.
 */
export function applyMutations(mutations: CircuitMutation[], store: CircuitStore): void {
    for (const m of mutations) {
        switch (m.type) {
            case 'COMPONENT_ADDED': {
                const component = m.payload.component as CircuitComponent & {
                    properties?: Record<string, unknown>;
                };
                const label =
                    (component.properties?.label as string | undefined) ?? component.label ?? '';
                store.addComponent({ ...component, label });
                break;
            }
            case 'COMPONENT_MOVED':
                store.moveComponent(
                    m.payload.componentId as string,
                    m.payload.position as Position
                );
                break;
            case 'COMPONENT_DELETED':
                store.deleteComponent(m.payload.componentId as string);
                break;
            case 'WIRE_ADDED':
                store.addWire(m.payload.wire as Wire);
                break;
            case 'WIRE_DELETED':
                store.deleteWire(m.payload.wireId as string);
                break;
            default:
                break;
        }
    }
}

export function TutorChat({ courseId, levelNumber, mode }: TutorChatProps) {
    const llmStore = useLLMConfigStore();
    const chatStore = useTutorChatStore();
    const circuitStore = useCircuitStore();

    const [input, setInput] = useState('');
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const key = threadKey(courseId, levelNumber, mode);
    const messages = chatStore.threads[key] ?? [];
    const { pending } = chatStore;

    useEffect(() => {
        scrollRef.current?.scrollTo?.({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }, [messages.length, pending]);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || pending) return;

        const config = llmStore.getConfig();
        if (!config) {
            setShowApiKeyModal(true);
            return;
        }

        const actorId =
            (typeof window !== 'undefined' && localStorage.getItem('participantId')) ||
            'course-learner';

        setInput('');
        setNotice(null);
        chatStore.appendMessage(key, { role: 'user', text });
        chatStore.setPending(true);

        const circuit = {
            sessionId: circuitStore.sessionId ?? 'course',
            version: circuitStore.version,
            schemaVersion: '1.0.0',
            components: circuitStore.components,
            wires: circuitStore.wires,
            annotations: circuitStore.annotations,
            updatedAt: new Date().toISOString(),
        };

        try {
            const result = await api.agentCourseTurn(
                courseId,
                levelNumber,
                mode,
                text,
                circuit,
                actorId,
                config
            );
            applyMutations(result.mutations, circuitStore);
            chatStore.appendMessage(key, {
                role: 'assistant',
                text: result.finalMessage || 'Done.',
            });
            if (result.aborted) {
                setNotice("I couldn't finish that one — try a smaller, more specific ask.");
            }
        } catch (err) {
            chatStore.appendMessage(key, {
                role: 'assistant',
                text:
                    err instanceof Error
                        ? `Something went wrong: ${err.message}`
                        : 'Something went wrong. Please try again.',
            });
        } finally {
            chatStore.setPending(false);
        }
    }, [input, pending, llmStore, chatStore, key, circuitStore, courseId, levelNumber, mode]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void send();
        }
    };

    return (
        <div
            className="glass-card flex flex-col overflow-hidden rounded-2xl"
            style={{ height: 460 }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span className="bg-primary/15 flex h-7 w-7 items-center justify-center rounded-lg text-primary">
                    <Sparkles className="h-4 w-4" />
                </span>
                <div>
                    <p className="text-sm font-semibold text-foreground">Circuit Tutor</p>
                    <p className="text-xs text-text-muted">
                        Ask about this {mode === 'theory' ? 'lesson' : 'build'} or your circuit
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-text-muted">
                        <Sparkles className="h-6 w-6 opacity-50" />
                        <p>
                            Stuck on a connection or unsure why the circuit isn&apos;t working? Ask
                            away.
                        </p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                                msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-surface-secondary text-text-secondary'
                            }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {pending && (
                    <div className="flex justify-start">
                        <div className="flex items-center gap-2 rounded-2xl bg-surface-secondary px-3 py-2 text-sm text-text-muted">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Thinking…
                        </div>
                    </div>
                )}
            </div>

            {/* Notice */}
            {notice && (
                <div className="border-warning/30 bg-warning/10 mx-4 mb-2 rounded-lg border px-3 py-2 text-xs text-warning">
                    {notice}
                </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={pending}
                        rows={1}
                        placeholder="Ask the tutor…"
                        className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
                        aria-label="Message the tutor"
                    />
                    <button
                        onClick={() => void send()}
                        disabled={pending || !input.trim()}
                        className="gradient-btn flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-foreground disabled:opacity-50"
                        aria-label="Send message"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <APIKeyModal
                isOpen={showApiKeyModal}
                onClose={() => setShowApiKeyModal(false)}
                onSave={() => setShowApiKeyModal(false)}
            />
        </div>
    );
}
