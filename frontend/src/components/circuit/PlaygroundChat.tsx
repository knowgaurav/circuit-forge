'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

import { Send, Sparkles, Loader2, X, Trash2 } from 'lucide-react';

import { APIKeyModal } from '@/components/ui/APIKeyModal';

import { api } from '@/services/api';
import { useCircuitStore } from '@/stores/circuitStore';
import { useLLMConfigStore } from '@/stores/llmConfigStore';

import { applyMutations } from './TutorChat';

import type { TutorMessage } from '@/types';

interface PlaygroundChatProps {
    onClose: () => void;
    messages: TutorMessage[];
    setMessages: React.Dispatch<React.SetStateAction<TutorMessage[]>>;
}

const PLAYGROUND_ACTOR_ID = 'playground-user';

export function PlaygroundChat({ onClose, messages, setMessages }: PlaygroundChatProps) {
    const llmStore = useLLMConfigStore();
    const circuitStore = useCircuitStore();

    const [input, setInput] = useState('');
    const [pending, setPending] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

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

        setInput('');
        setNotice(null);
        // Snapshot prior turns (excluding the message we're about to add) so the
        // assistant has conversational context, not just the latest line.
        const history = messages.map((m) => ({ role: m.role, text: m.text }));
        setMessages((prev) => [...prev, { role: 'user', text }]);
        setPending(true);

        const circuit = {
            sessionId: circuitStore.sessionId ?? 'playground',
            version: circuitStore.version,
            schemaVersion: '1.0.0',
            components: circuitStore.components,
            wires: circuitStore.wires,
            annotations: circuitStore.annotations,
            updatedAt: new Date().toISOString(),
        };

        try {
            const result = await api.agentPlaygroundTurn(
                text,
                circuit,
                PLAYGROUND_ACTOR_ID,
                config,
                history
            );
            applyMutations(result.mutations, circuitStore);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', text: result.finalMessage || 'Done.' },
            ]);
            if (result.aborted) {
                setNotice("I couldn't finish that one — try a smaller, more specific ask.");
            }
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    text:
                        err instanceof Error
                            ? `Something went wrong: ${err.message}`
                            : 'Something went wrong. Please try again.',
                },
            ]);
        } finally {
            setPending(false);
        }
    }, [input, pending, llmStore, circuitStore, messages, setMessages]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void send();
        }
    };

    return (
        <div className="flex h-full flex-col overflow-hidden border-l border-border bg-surface">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span className="bg-primary/15 flex h-7 w-7 items-center justify-center rounded-lg text-primary">
                    <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Circuit Assistant</p>
                    <p className="text-xs text-text-muted">
                        Describe a circuit and I&apos;ll build it
                    </p>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={() => setMessages([])}
                        disabled={pending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-secondary hover:text-foreground disabled:opacity-50"
                        aria-label="Clear conversation"
                        title="Clear conversation"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
                <button
                    onClick={onClose}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
                    aria-label="Close assistant"
                    title="Close assistant"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-text-muted">
                        <Sparkles className="h-6 w-6 opacity-50" />
                        <p>
                            Try &quot;Build a circuit where an LED lights up when both switches are
                            on&quot; or ask me to fix a connection.
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
                        placeholder="Ask the assistant to build or fix a circuit…"
                        className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
                        aria-label="Message the assistant"
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
