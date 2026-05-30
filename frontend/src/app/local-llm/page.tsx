'use client';

import { useState } from 'react';

import Link from 'next/link';

import { motion } from 'framer-motion';
import {
    Terminal,
    Check,
    Copy,
    Server,
    Cloud,
    KeyRound,
    Cpu,
    ArrowRight,
    ShieldCheck,
    Lock,
    Power,
    AlertTriangle,
    Download,
    Sparkles,
    HardDrive,
    Network,
} from 'lucide-react';

import {
    Navbar,
    Footer,
    FadeIn,
    GradientText,
    Button,
    StaggerContainer,
    fadeInItemVariants,
} from '@/components/ui';

import { cn } from '@/lib/utils';

const BRIDGE_REPO = 'https://github.com/Algozenith/circuit-forge/tree/main/cli';
const INSTALL_CMD =
    'pip install git+https://github.com/Algozenith/circuit-forge.git#subdirectory=cli';

/* ------------------------------------------------------------------ */
/* Copyable code line                                                  */
/* ------------------------------------------------------------------ */

function CodeBlock({
    code,
    label,
    className,
}: {
    code: string;
    label?: string;
    className?: string;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            /* clipboard unavailable — no-op */
        }
    };

    return (
        <div
            className={cn(
                'group/code relative overflow-hidden rounded-xl border border-border bg-[#05080f] shadow-glass',
                className
            )}
        >
            {label && (
                <div className="border-border/70 flex items-center gap-2 border-b bg-surface-secondary px-4 py-2">
                    <Terminal className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
                        {label}
                    </span>
                </div>
            )}
            <div className="flex items-start gap-3 px-4 py-3.5">
                <span aria-hidden className="text-primary/70 select-none pt-px font-mono text-sm">
                    $
                </span>
                <code className="custom-scrollbar block flex-1 overflow-x-auto whitespace-pre font-mono text-[13px] leading-relaxed text-text-secondary">
                    {code}
                </code>
                <button
                    onClick={handleCopy}
                    aria-label="Copy command"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-all hover:border-primary hover:text-primary"
                >
                    {copied ? (
                        <Check className="h-4 w-4 text-success" />
                    ) : (
                        <Copy className="h-4 w-4" />
                    )}
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* OS-specific cloudflared install                                     */
/* ------------------------------------------------------------------ */

const OS_TABS = [
    {
        id: 'macos',
        label: 'macOS',
        cmd: 'brew install cloudflared',
    },
    {
        id: 'windows',
        label: 'Windows',
        cmd: 'winget install Cloudflare.cloudflared',
    },
    {
        id: 'linux',
        label: 'Linux',
        cmd: 'curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb && sudo dpkg -i cloudflared.deb',
    },
] as const;

function CloudflaredInstaller() {
    const [active, setActive] = useState<(typeof OS_TABS)[number]['id']>('macos');
    const activeTab = OS_TABS.find((t) => t.id === active)!;

    return (
        <div>
            <div className="mb-3 inline-flex rounded-xl border border-border bg-surface-secondary p-1">
                {OS_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActive(tab.id)}
                        className={cn(
                            'rounded-lg px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-wider transition-all',
                            active === tab.id
                                ? 'bg-primary text-primary-foreground shadow-glow'
                                : 'text-text-muted hover:text-foreground'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <CodeBlock code={activeTab.cmd} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Static data                                                         */
/* ------------------------------------------------------------------ */

const SERVERS = [
    { name: 'Ollama', port: '11434', note: 'Recommended', recommended: true },
    { name: 'LM Studio', port: '1234', note: 'Desktop app' },
    { name: 'vLLM', port: '8000', note: 'High-throughput' },
    { name: 'LocalAI', port: '8080', note: 'Self-hosted' },
    { name: 'Jan', port: '1337', note: 'Desktop app' },
    { name: 'text-gen-webui', port: '5000', note: 'OpenAI mode' },
];

const SECURITY = [
    {
        icon: <KeyRound className="h-5 w-5" />,
        title: 'Token authentication',
        body: 'Every request must carry the bridge token. Requests without it are rejected with 401.',
    },
    {
        icon: <Lock className="h-5 w-5" />,
        title: 'Fresh token per session',
        body: 'A new random token is generated each time you start the bridge. Nothing is stored long-term.',
    },
    {
        icon: <Power className="h-5 w-5" />,
        title: 'No persistent exposure',
        body: 'The tunnel only lives while the CLI runs. Close the terminal and the door shuts.',
    },
    {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: 'HTTPS end to end',
        body: 'All traffic between CircuitForge and your machine is encrypted through Cloudflare.',
    },
];

const TROUBLESHOOTING = [
    {
        problem: 'cloudflared not installed',
        fix: 'Install it using the command for your OS in Step 1, then re-run the bridge.',
    },
    {
        problem: 'No LLM servers found',
        fix: 'Make sure your model server is running. For Ollama, check it with: curl http://localhost:11434/api/tags',
    },
    {
        problem: 'Bridge token rejected (401)',
        fix: 'Re-copy the token from the terminal. A new token is generated every run, so old ones stop working.',
    },
    {
        problem: 'Connection timeout',
        fix: 'Confirm your firewall allows outbound connections and that cloudflared can reach Cloudflare. Restart the bridge.',
    },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LocalLLMPage() {
    return (
        <div className="min-h-screen overflow-x-hidden bg-background selection:bg-primary selection:text-primary-foreground">
            <Navbar showSessionButtons={false} />

            {/* ---------------- Hero ---------------- */}
            <section className="relative overflow-hidden px-4 pb-16 pt-32">
                <div className="bg-grid pointer-events-none absolute inset-0" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_35%,var(--background)_85%)]" />
                <div className="bg-primary/10 pointer-events-none absolute left-1/2 top-0 h-[480px] w-[780px] -translate-x-1/2 rounded-full blur-3xl" />

                <div className="relative mx-auto max-w-4xl text-center">
                    <FadeIn direction="down">
                        <div className="border-primary/30 bg-primary/10 mb-6 inline-flex items-center gap-2 rounded border px-3 py-1 font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">
                            <HardDrive className="h-3.5 w-3.5" />
                            Bring your own model
                        </div>
                    </FadeIn>
                    <FadeIn direction="up" delay={0.05}>
                        <h1 className="mb-6 font-heading text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-6xl">
                            Run CircuitForge on your
                            <br />
                            <GradientText>own local models</GradientText>
                        </h1>
                    </FadeIn>
                    <FadeIn direction="up" delay={0.1}>
                        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-text-secondary">
                            Keep your prompts and data on your machine. The bridge CLI connects a
                            local LLM &mdash; Ollama, LM Studio, vLLM, LocalAI and more &mdash; to
                            CircuitForge through a secure, private tunnel. No API bills, no data
                            leaving your laptop.
                        </p>
                    </FadeIn>
                    <FadeIn direction="up" delay={0.15}>
                        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <a href="#setup">
                                <Button size="lg" variant="glow" className="px-8 text-base">
                                    <Terminal className="mr-2 h-5 w-5" />
                                    Start the setup
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </a>
                            <a href={BRIDGE_REPO} target="_blank" rel="noopener noreferrer">
                                <Button size="lg" variant="secondary" className="px-8 text-base">
                                    <Download className="mr-2 h-5 w-5" />
                                    View CLI source
                                </Button>
                            </a>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ---------------- How it connects ---------------- */}
            <section className="border-y border-border bg-surface-secondary px-4 py-20">
                <div className="mx-auto max-w-5xl">
                    <FadeIn direction="up" className="mb-12 text-center">
                        <p className="eyebrow mb-3">&#47;&#47; The big picture</p>
                        <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
                            How the bridge works
                        </h2>
                        <p className="mx-auto max-w-2xl text-text-secondary">
                            CircuitForge runs in the cloud, your model runs at home. The bridge is a
                            small proxy that links the two and checks a token on every request.
                        </p>
                    </FadeIn>

                    <FadeIn direction="up" delay={0.1}>
                        <div className="clip-corner relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-glass-lg md:p-10">
                            <div className="bg-grid-sm pointer-events-none absolute inset-0 opacity-40" />
                            <div className="relative grid items-stretch gap-4 md:grid-cols-4">
                                {[
                                    {
                                        icon: <Cloud className="h-6 w-6" />,
                                        title: 'CircuitForge',
                                        sub: 'Runs in the cloud',
                                    },
                                    {
                                        icon: <Network className="h-6 w-6" />,
                                        title: 'Cloudflare Tunnel',
                                        sub: 'Encrypted HTTPS',
                                    },
                                    {
                                        icon: <ShieldCheck className="h-6 w-6" />,
                                        title: 'Bridge Proxy',
                                        sub: 'Validates token',
                                    },
                                    {
                                        icon: <Server className="h-6 w-6" />,
                                        title: 'Your Local LLM',
                                        sub: 'Ollama, vLLM…',
                                    },
                                ].map((node, i) => (
                                    <div key={node.title} className="relative">
                                        <div className="flex h-full flex-col items-center gap-3 rounded-xl border border-border bg-surface-secondary p-5 text-center">
                                            <div className="border-primary/30 bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl border text-primary">
                                                {node.icon}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-foreground">
                                                    {node.title}
                                                </div>
                                                <div className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-text-muted">
                                                    {node.sub}
                                                </div>
                                            </div>
                                        </div>
                                        {i < 3 && (
                                            <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                                                <ArrowRight className="text-primary/60 h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ---------------- Setup steps ---------------- */}
            <section id="setup" className="relative scroll-mt-24 bg-background px-4 py-24">
                <div className="mx-auto max-w-3xl">
                    <FadeIn direction="up" className="mb-16 text-center">
                        <p className="eyebrow mb-3">&#47;&#47; 5 steps</p>
                        <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
                            Set it up in <GradientText>five steps</GradientText>
                        </h2>
                        <p className="mx-auto max-w-xl text-text-secondary">
                            Roughly five minutes end to end. You only do steps 1&ndash;3 once.
                        </p>
                    </FadeIn>

                    <div className="relative space-y-12">
                        {/* vertical rail */}
                        <div className="from-primary/50 absolute bottom-0 left-[19px] top-2 hidden w-px bg-gradient-to-b via-border to-transparent md:block" />

                        {/* Step 1 */}
                        <StepRow
                            n={1}
                            icon={<Server className="h-5 w-5" />}
                            title="Start your local LLM server"
                        >
                            <p className="mb-4 text-text-secondary">
                                Pick whichever runtime you already use and make sure it is serving a
                                model. For Ollama, that is:
                            </p>
                            <CodeBlock code="ollama serve" label="terminal" />
                            <p className="mt-3 text-sm text-text-muted">
                                Using LM Studio, vLLM, LocalAI, Jan, or text-generation-webui? Just
                                start its local server &mdash; the bridge auto-detects all of them.
                            </p>
                        </StepRow>

                        {/* Step 2 */}
                        <StepRow
                            n={2}
                            icon={<Cloud className="h-5 w-5" />}
                            title="Install cloudflared"
                        >
                            <p className="mb-4 text-text-secondary">
                                The bridge uses a Cloudflare tunnel to reach your machine securely.
                                Install the <span className="text-primary">cloudflared</span> CLI
                                for your operating system:
                            </p>
                            <CloudflaredInstaller />
                        </StepRow>

                        {/* Step 3 */}
                        <StepRow
                            n={3}
                            icon={<Download className="h-5 w-5" />}
                            title="Install the bridge CLI"
                        >
                            <p className="mb-4 text-text-secondary">
                                Install the{' '}
                                <span className="text-primary">circuitforge-bridge</span> package
                                with pip (Python 3.9 or newer):
                            </p>
                            <CodeBlock code={INSTALL_CMD} label="terminal" />
                        </StepRow>

                        {/* Step 4 */}
                        <StepRow
                            n={4}
                            icon={<Terminal className="h-5 w-5" />}
                            title="Run the bridge"
                        >
                            <p className="mb-4 text-text-secondary">
                                Start the bridge. It scans for your model server, opens a tunnel,
                                and prints a <span className="text-primary">URL</span> and{' '}
                                <span className="text-primary">Token</span>.
                            </p>
                            <CodeBlock code="circuitforge-bridge" label="terminal" />
                            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-[#05080f]">
                                <div className="border-border/70 border-b bg-surface-secondary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
                                    example output
                                </div>
                                <pre className="custom-scrollbar overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-text-secondary">
                                    {`🔗 CircuitForge Local Bridge v1.0.0

✓ Found: Ollama at localhost:11434
  Models: llama3.2, qwen2.5, mistral

Starting Cloudflare tunnel...
✓ Tunnel ready!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Paste these values in CircuitForge:
  URL:   `}
                                    <span className="text-primary">
                                        https://abc-def.trycloudflare.com
                                    </span>
                                    {`
  Token: `}
                                    <span className="text-primary">vT9x…q2Lm</span>
                                    {`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}
                                </pre>
                            </div>
                            <div className="border-warning/30 bg-warning/5 mt-4 flex items-start gap-3 rounded-xl border p-4">
                                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
                                <p className="text-sm text-text-secondary">
                                    Keep this terminal open while you use CircuitForge. Closing it
                                    shuts the tunnel and disconnects your model.
                                </p>
                            </div>
                        </StepRow>

                        {/* Step 5 */}
                        <StepRow
                            n={5}
                            icon={<KeyRound className="h-5 w-5" />}
                            title="Paste into CircuitForge"
                            last
                        >
                            <p className="mb-4 text-text-secondary">
                                Open the AI provider settings, choose{' '}
                                <span className="text-primary">Local LLM</span>, and paste the
                                values from your terminal:
                            </p>
                            <ul className="mb-5 space-y-2.5">
                                {[
                                    ['Tunnel URL', 'the https://….trycloudflare.com address'],
                                    ['Bridge Token', 'the token string from the terminal'],
                                    ['Model', 'click “Fetch Models”, then pick one'],
                                ].map(([label, hint]) => (
                                    <li key={label} className="flex items-start gap-3">
                                        <div className="border-primary/30 bg-primary/15 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border">
                                            <Check className="h-3 w-3 text-primary" />
                                        </div>
                                        <span className="text-sm text-text-secondary">
                                            <span className="font-semibold text-foreground">
                                                {label}
                                            </span>{' '}
                                            &mdash; {hint}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/courses/create">
                                <Button variant="primary" className="gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    Open AI Courses to configure
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                            <p className="mt-3 text-sm text-text-muted">
                                Hit &ldquo;Configure AI Provider&rdquo;, select the{' '}
                                <span className="text-primary">🏠 Local LLM</span> tile, and you are
                                ready to generate.
                            </p>
                        </StepRow>
                    </div>
                </div>
            </section>

            {/* ---------------- Supported servers ---------------- */}
            <section className="border-y border-border bg-surface-secondary px-4 py-24">
                <div className="mx-auto max-w-5xl">
                    <FadeIn direction="up" className="mb-14 text-center">
                        <p className="eyebrow mb-3">&#47;&#47; Auto-detected</p>
                        <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
                            Works with your stack
                        </h2>
                        <p className="mx-auto max-w-2xl text-text-secondary">
                            The bridge scans these common ports automatically. Running something
                            else? Point it anywhere with{' '}
                            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-sm text-primary">
                                --port
                            </code>
                            .
                        </p>
                    </FadeIn>

                    <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {SERVERS.map((s) => (
                            <motion.div key={s.name} variants={fadeInItemVariants}>
                                <div
                                    className={cn(
                                        'group flex items-center justify-between rounded-xl border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow',
                                        s.recommended
                                            ? 'border-primary/40 shadow-glow'
                                            : 'hover:border-primary/40 border-border'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="border-primary/30 bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg border text-primary">
                                            <Cpu className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-foreground">
                                                {s.name}
                                            </div>
                                            <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                                                {s.note}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="rounded-md border border-border bg-surface-secondary px-2 py-1 font-mono text-xs text-text-secondary">
                                        :{s.port}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </StaggerContainer>

                    <FadeIn direction="up" delay={0.2}>
                        <div className="mt-8 rounded-xl border border-border bg-surface p-5">
                            <p className="mb-3 text-sm text-text-secondary">Custom port example:</p>
                            <CodeBlock code="circuitforge-bridge --port 8000" />
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ---------------- Security ---------------- */}
            <section className="bg-background px-4 py-24">
                <div className="mx-auto max-w-5xl">
                    <FadeIn direction="up" className="mb-14 text-center">
                        <p className="eyebrow mb-3">&#47;&#47; Private by design</p>
                        <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
                            Your data stays yours
                        </h2>
                        <p className="mx-auto max-w-2xl text-text-secondary">
                            The tunnel only carries inference traffic, and only while you choose to
                            run it.
                        </p>
                    </FadeIn>

                    <StaggerContainer className="grid gap-5 sm:grid-cols-2">
                        {SECURITY.map((item) => (
                            <motion.div key={item.title} variants={fadeInItemVariants}>
                                <div className="hover:border-primary/40 flex h-full items-start gap-4 rounded-xl border border-border bg-surface p-6 transition-all duration-200 hover:shadow-glow">
                                    <div className="border-primary/30 bg-primary/10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border text-primary">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h3 className="mb-1.5 font-semibold text-foreground">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-text-muted">
                                            {item.body}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </StaggerContainer>
                </div>
            </section>

            {/* ---------------- Troubleshooting ---------------- */}
            <section className="border-y border-border bg-surface-secondary px-4 py-24">
                <div className="mx-auto max-w-3xl">
                    <FadeIn direction="up" className="mb-12 text-center">
                        <p className="eyebrow mb-3">&#47;&#47; Stuck?</p>
                        <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
                            Troubleshooting
                        </h2>
                    </FadeIn>

                    <div className="space-y-4">
                        {TROUBLESHOOTING.map((item, i) => (
                            <FadeIn key={item.problem} direction="up" delay={i * 0.05}>
                                <div className="rounded-xl border border-border bg-surface p-5">
                                    <div className="mb-2 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
                                        <h3 className="font-mono text-sm font-semibold text-foreground">
                                            {item.problem}
                                        </h3>
                                    </div>
                                    <p className="pl-6 text-sm leading-relaxed text-text-muted">
                                        {item.fix}
                                    </p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------------- CTA ---------------- */}
            <section className="relative overflow-hidden px-4 py-28">
                <div className="bg-grid pointer-events-none absolute inset-0" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,var(--background)_80%)]" />
                <div className="bg-primary/10 pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />

                <FadeIn direction="up" className="relative z-10 mx-auto max-w-2xl text-center">
                    <p className="eyebrow mb-4">&#47;&#47; Power on</p>
                    <h2 className="mb-6 font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                        Generate courses with <GradientText>your own model</GradientText>
                    </h2>
                    <p className="mx-auto mb-10 max-w-xl text-lg text-text-secondary">
                        Once the bridge is running, every AI feature in CircuitForge runs through
                        your local model.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link href="/courses/create">
                            <Button size="lg" variant="glow" className="px-8 text-base">
                                <Sparkles className="mr-2 h-5 w-5" />
                                Try AI Courses
                            </Button>
                        </Link>
                        <a href={BRIDGE_REPO} target="_blank" rel="noopener noreferrer">
                            <Button size="lg" variant="secondary" className="px-8 text-base">
                                CLI documentation
                            </Button>
                        </a>
                    </div>
                </FadeIn>
            </section>

            <Footer />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step row                                                            */
/* ------------------------------------------------------------------ */

function StepRow({
    n,
    icon,
    title,
    children,
    last = false,
}: {
    n: number;
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    last?: boolean;
}) {
    return (
        <FadeIn direction="up" delay={0.05}>
            <div className="relative flex gap-5">
                <div className="relative z-10 flex-shrink-0">
                    <div className="border-primary/40 bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl border text-primary shadow-glow">
                        {icon}
                    </div>
                </div>
                <div className={cn('flex-1 pb-2', last ? '' : '')}>
                    <div className="mb-3 flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            Step {n}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    <h3 className="mb-4 font-heading text-xl font-bold text-foreground">{title}</h3>
                    {children}
                </div>
            </div>
        </FadeIn>
    );
}
