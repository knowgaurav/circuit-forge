import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Playground",
    description: "Practice building circuits freely in the CircuitForge playground. No account required.",
};

export default function PlaygroundLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
