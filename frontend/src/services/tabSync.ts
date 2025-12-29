/**
 * TabSyncManager Service
 * Coordinates cross-tab communication and leader election for session synchronization
 */

import type {
    SessionLock,
    SyncState,
    SyncAction,
    BroadcastMessage,
    TabSyncStatus
} from '@/types';

const LOCK_TIMEOUT = 5000; // 5 seconds - lock is stale after this
const HEARTBEAT_INTERVAL = 2000; // 2 seconds - leader heartbeat frequency
const FAILOVER_CHECK_INTERVAL = 1000; // 1 second - how often followers check for leader

type StateCallback = (state: SyncState) => void;
type ActionCallback = (action: SyncAction) => void;
type StatusCallback = (status: TabSyncStatus) => void;

export class TabSyncManager {
    private tabId: string;
    private sessionCode: string = '';
    private participantId: string = '';
    private channel: BroadcastChannel | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private failoverCheckInterval: NodeJS.Timeout | null = null;
    private lastLeaderHeartbeat: number = 0;
    private _isLeader: boolean = false;
    private isDestroyed: boolean = false;

    // Callbacks
    private onStateReceivedCallback: StateCallback | null = null;
    private onActionReceivedCallback: ActionCallback | null = null;
    private onStatusChangeCallback: StatusCallback | null = null;

    constructor() {
        // Generate unique tab ID (deterministic for tie-breaking)
        this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Initialize the tab sync manager for a session
     */
    initialize(sessionCode: string, participantId: string): void {
        this.sessionCode = sessionCode;
        this.participantId = participantId;
        this.isDestroyed = false;

        // Create BroadcastChannel for this session
        this.channel = new BroadcastChannel(`circuitforge-session-${sessionCode}`);
        this.channel.onmessage = this.handleMessage.bind(this);

        // Try to acquire leadership
        const acquired = this.acquireLock();
        if (acquired) {
            this.becomeLeader();
        } else {
            this.becomeFollower();
        }
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        this.isDestroyed = true;
        this.stopHeartbeat();
        this.stopFailoverCheck();

        if (this._isLeader) {
            this.releaseLock();
        }

        if (this.channel) {
            this.channel.close();
            this.channel = null;
        }
    }

    /**
     * Check if this tab is the leader
     */
    isLeader(): boolean {
        return this._isLeader;
    }

    /**
     * Get current tab ID
     */
    getTabId(): string {
        return this.tabId;
    }

    /**
     * Get current sync status
     */
    getStatus(): TabSyncStatus {
        if (this._isLeader) return 'leader';
        if (this.channel) return 'follower';
        return 'disconnected';
    }

    /**
     * Try to acquire the session lock
     * Returns true if lock was acquired (become leader)
     */
    acquireLock(): boolean {
        const lockKey = this.getLockKey();
        const existing = localStorage.getItem(lockKey);

        if (existing) {
            try {
                const lock: SessionLock = JSON.parse(existing);
                const age = Date.now() - lock.lastHeartbeat;

                // Lock is fresh - cannot acquire
                if (age < LOCK_TIMEOUT) {
                    return false;
                }
                // Lock is stale - can acquire
            } catch {
                // Invalid lock data - can acquire
            }
        }

        // Acquire the lock
        const newLock: SessionLock = {
            tabId: this.tabId,
            sessionCode: this.sessionCode,
            acquiredAt: Date.now(),
            lastHeartbeat: Date.now(),
        };
        localStorage.setItem(lockKey, JSON.stringify(newLock));

        // Verify we actually got the lock (handle race conditions)
        const verifyLock = localStorage.getItem(lockKey);
        if (verifyLock) {
            const parsed: SessionLock = JSON.parse(verifyLock);
            return parsed.tabId === this.tabId;
        }

        return false;
    }

    /**
     * Release the session lock
     */
    releaseLock(): void {
        const lockKey = this.getLockKey();
        const existing = localStorage.getItem(lockKey);

        if (existing) {
            try {
                const lock: SessionLock = JSON.parse(existing);
                // Only release if we own the lock
                if (lock.tabId === this.tabId) {
                    localStorage.removeItem(lockKey);
                }
            } catch {
                // Invalid lock data - remove it
                localStorage.removeItem(lockKey);
            }
        }
    }

    /**
     * Broadcast state to all tabs
     */
    broadcastState(state: SyncState): void {
        if (!this._isLeader || !this.channel) return;

        const message: BroadcastMessage = {
            type: 'state:sync',
            state,
        };
        this.channel.postMessage(message);
    }

    /**
     * Request state from the leader tab
     */
    requestStateFromLeader(): void {
        if (this._isLeader || !this.channel) return;

        const message: BroadcastMessage = {
            type: 'state:request',
            tabId: this.tabId,
        };
        this.channel.postMessage(message);
    }

    /**
     * Forward an action to the leader tab
     */
    forwardAction(action: SyncAction): void {
        if (this._isLeader || !this.channel) return;

        const message: BroadcastMessage = {
            type: 'action:forward',
            action,
        };
        this.channel.postMessage(message);
    }

    /**
     * Broadcast action result to all tabs
     */
    broadcastActionResult(action: SyncAction, success: boolean): void {
        if (!this._isLeader || !this.channel) return;

        const message: BroadcastMessage = {
            type: 'action:result',
            action,
            success,
        };
        this.channel.postMessage(message);
    }

    /**
     * Register callback for state updates
     */
    onStateReceived(callback: StateCallback): void {
        this.onStateReceivedCallback = callback;
    }

    /**
     * Register callback for forwarded actions (leader only)
     */
    onActionReceived(callback: ActionCallback): void {
        this.onActionReceivedCallback = callback;
    }

    /**
     * Register callback for status changes
     */
    onStatusChange(callback: StatusCallback): void {
        this.onStatusChangeCallback = callback;
    }

    // Private methods

    private getLockKey(): string {
        return `circuitforge-lock-${this.sessionCode}`;
    }

    private becomeLeader(): void {
        this._isLeader = true;
        this.startHeartbeat();
        this.stopFailoverCheck();
        this.announceLeadership();
        this.onStatusChangeCallback?.('leader');
    }

    private becomeFollower(): void {
        this._isLeader = false;
        this.stopHeartbeat();
        this.startFailoverCheck();
        this.lastLeaderHeartbeat = Date.now();
        this.requestStateFromLeader();
        this.onStatusChangeCallback?.('follower');
    }

    private announceLeadership(): void {
        if (!this.channel) return;

        const message: BroadcastMessage = {
            type: 'leader:announce',
            tabId: this.tabId,
            timestamp: Date.now(),
        };
        this.channel.postMessage(message);
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (this.isDestroyed) return;
            this.updateHeartbeat();
            this.sendHeartbeat();
        }, HEARTBEAT_INTERVAL);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private updateHeartbeat(): void {
        const lockKey = this.getLockKey();
        const existing = localStorage.getItem(lockKey);

        if (existing) {
            try {
                const lock: SessionLock = JSON.parse(existing);
                if (lock.tabId === this.tabId) {
                    lock.lastHeartbeat = Date.now();
                    localStorage.setItem(lockKey, JSON.stringify(lock));
                }
            } catch {
                // Lock corrupted - try to reacquire
                this.acquireLock();
            }
        }
    }

    private sendHeartbeat(): void {
        if (!this.channel) return;

        const message: BroadcastMessage = {
            type: 'leader:heartbeat',
            tabId: this.tabId,
            timestamp: Date.now(),
        };
        this.channel.postMessage(message);
    }

    private startFailoverCheck(): void {
        this.stopFailoverCheck();

        this.failoverCheckInterval = setInterval(() => {
            if (this.isDestroyed) return;
            this.checkForLeaderFailover();
        }, FAILOVER_CHECK_INTERVAL);
    }

    private stopFailoverCheck(): void {
        if (this.failoverCheckInterval) {
            clearInterval(this.failoverCheckInterval);
            this.failoverCheckInterval = null;
        }
    }

    private checkForLeaderFailover(): void {
        const timeSinceLastHeartbeat = Date.now() - this.lastLeaderHeartbeat;

        if (timeSinceLastHeartbeat > LOCK_TIMEOUT) {
            // Leader seems dead - try to acquire leadership
            const acquired = this.acquireLock();
            if (acquired) {
                this.becomeLeader();
            }
        }
    }

    private handleMessage(event: MessageEvent): void {
        if (this.isDestroyed) return;

        const message = event.data as BroadcastMessage;

        switch (message.type) {
            case 'leader:announce':
                if (!this._isLeader) {
                    this.lastLeaderHeartbeat = message.timestamp;
                } else if (message.tabId !== this.tabId) {
                    // Another tab claims leadership - use tie-breaker
                    if (message.tabId < this.tabId) {
                        // Other tab has lower ID - yield leadership
                        this.releaseLock();
                        this.becomeFollower();
                    }
                }
                break;

            case 'leader:heartbeat':
                if (!this._isLeader) {
                    this.lastLeaderHeartbeat = message.timestamp;
                }
                break;

            case 'state:sync':
                if (!this._isLeader) {
                    this.onStateReceivedCallback?.(message.state);
                }
                break;

            case 'state:request':
                // Leader should respond with current state
                // This is handled by the hook that uses TabSyncManager
                break;

            case 'action:forward':
                if (this._isLeader) {
                    this.onActionReceivedCallback?.(message.action);
                }
                break;

            case 'action:result':
                // Followers can use this to confirm their actions were processed
                break;
        }
    }
}

// Export factory function
export function createTabSyncManager(): TabSyncManager {
    return new TabSyncManager();
}
