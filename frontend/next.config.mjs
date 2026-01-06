import { withAxiom } from "@axiomhq/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
};

export default withAxiom(nextConfig);
