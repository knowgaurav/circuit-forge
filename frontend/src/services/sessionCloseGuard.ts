/**
 * SessionCloseGuard Service
 * Manages close protection and navigation guards for active sessions
 */

import type { CloseGuardOptions } from '@/types';

export class SessionCloseGuard {
    private isEnabled: boolean = false;
    private options: CloseGuardOptions | null = null;
    private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

    /**
     * Enable close protection for the session
     */
    enable(options: CloseGuardOptions): void {
        if (this.isEnabled) {
            this.disable();
        }

        this.options = options;
        this.isEnabled = true;

        // Register beforeunload handler
        this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
            // Only show warning if there are students (for teacher) or always for students
            if (this.shouldShowWarning()) {
                e.preventDefault();
                // Modern browsers require returnValue to be set
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

    /**
     * Disable close protection
     */
    disable(): void {
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
        }

        this.isEnabled = false;
        this.options = null;
    }

    /**
     * Check if protection is currently active
     */
    isActive(): boolean {
        return this.isEnabled;
    }

    /**
     * Get the current student count
     */
    getStudentCount(): number {
        return this.options?.studentCount ?? 0;
    }

    /**
     * Check if the current user is a teacher
     */
    isTeacher(): boolean {
        return this.options?.isTeacher ?? false;
    }

    /**
     * Update the student count (for dynamic updates)
     */
    updateStudentCount(count: number): void {
        if (this.options) {
            this.options.studentCount = count;
        }
    }

    /**
     * Determine if warning should be shown based on current state
     */
    shouldShowWarning(): boolean {
        if (!this.options) return false;

        // Teachers get warning only if students are connected
        if (this.options.isTeacher) {
            return this.options.studentCount > 0;
        }

        // Students always get warning when in session
        return true;
    }

    /**
     * Handle explicit leave action (e.g., clicking Leave button)
     * Returns true if leave should proceed, false if cancelled
     */
    handleLeaveRequest(): { shouldShowModal: boolean; studentCount: number } {
        if (!this.options) {
            return { shouldShowModal: false, studentCount: 0 };
        }

        // Teachers with students should see confirmation modal
        if (this.options.isTeacher && this.options.studentCount > 0) {
            return { shouldShowModal: true, studentCount: this.options.studentCount };
        }

        // Students or teachers without students can leave directly
        return { shouldShowModal: false, studentCount: 0 };
    }

    /**
     * Confirm leaving the session
     */
    confirmLeave(): void {
        this.options?.onLeaveConfirmed();
        this.disable();
    }

    /**
     * Cancel leaving the session
     */
    cancelLeave(): void {
        this.options?.onLeaveCancelled();
    }
}

// Export singleton instance
export const sessionCloseGuard = new SessionCloseGuard();
