import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Templates",
    description: "Browse 30+ guided circuit templates covering logic gates, flip-flops, CPUs, robotics, and automation.",
};

export default function TemplatesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
