import '@testing-library/jest-dom';

// Mock localStorage for tests
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock BroadcastChannel for tests
class MockBroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(name: string) {
        this.name = name;
    }

    postMessage(_message: unknown) {
        // Mock implementation - can be extended in tests
    }

    close() {
        // Mock implementation
    }
}

Object.defineProperty(window, 'BroadcastChannel', {
    value: MockBroadcastChannel,
});
