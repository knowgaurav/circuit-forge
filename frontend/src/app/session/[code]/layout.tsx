import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Session",
    description: "Collaborative circuit design session. Build and learn together in real-time.",
};

export default function SessionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
