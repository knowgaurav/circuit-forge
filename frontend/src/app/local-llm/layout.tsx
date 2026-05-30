import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Use Your Own Local Models',
    description:
        'Step-by-step guide to connect your local LLM (Ollama, LM Studio, vLLM, LocalAI) to CircuitForge using the bridge CLI and a Cloudflare tunnel.',
};

export default function LocalLLMLayout({ children }: { children: React.ReactNode }) {
    return children;
}
