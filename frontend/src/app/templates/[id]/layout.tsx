import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Template",
    description: "Learn circuit design with this guided template. Step-by-step instructions included.",
};

export default function TemplateDetailLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
