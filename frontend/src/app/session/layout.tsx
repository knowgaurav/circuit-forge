import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sessions',
    description:
        'Join an existing collaborative circuit session with a code, or start a new one as a teacher.',
};

export default function SessionLobbyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
