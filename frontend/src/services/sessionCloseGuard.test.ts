/**
 * Property-based tests for SessionCloseGuard
 * 
 * **Feature: session-management, Property 1: Close Protection Registration**
 * **Validates: Requirements 1.1, 1.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { SessionCloseGuard } from './sessionCloseGuard';

describe('SessionCloseGuard', () => {
    let guard: SessionCloseGuard;
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
    let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        guard = new SessionCloseGuard();
        addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    });

    /**
     * **Feature: session-management, Property 1: Close Protection Registration**
     * **Validates: Requirements 1.1, 1.5**
     * 
     * For any session state with one or more participants (teacher or students), 
     * the beforeunload event handler SHALL be registered to prevent accidental closure.
     */
    describe('Property 1: Close Protection Registration', () => {
        it('registers beforeunload handler when enabled with students', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 20 }), // studentCount > 0
                    fc.boolean(), // isTeacher
                    (studentCount, isTeacher) => {
                        addEventListenerSpy.mockClear();

                        const testGuard = new SessionCloseGuard();
                        testGuard.enable({
                            isTeacher,
                            studentCount,
                            onLeaveConfirmed: () => { },
                            onLeaveCancelled: () => { },
                        });

                        expect(addEventListenerSpy).toHaveBeenCalledWith(
                            'beforeunload',
                            expect.any(Function)
                        );
                        expect(testGuard.isActive()).toBe(true);

                        testGuard.disable();
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('teacher with students should show warning', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 20 }), // studentCount > 0
                    (studentCount) => {
                        const testGuard = new SessionCloseGuard();
                        testGuard.enable({
                            isTeacher: true,
                            studentCount,
                            onLeaveConfirmed: () => { },
                            onLeaveCancelled: () => { },
                        });

                        expect(testGuard.shouldShowWarning()).toBe(true);

                        testGuard.disable();
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('teacher without students should not show warning', () => {
            const testGuard = new SessionCloseGuard();
            testGuard.enable({
                isTeacher: true,
                studentCount: 0,
                onLeaveConfirmed: () => { },
                onLeaveCancelled: () => { },
            });

            expect(testGuard.shouldShowWarning()).toBe(false);

            testGuard.disable();
        });

        it('student should always show warning', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 20 }), // any studentCount
                    (studentCount) => {
                        const testGuard = new SessionCloseGuard();
                        testGuard.enable({
                            isTeacher: false,
                            studentCount,
                            onLeaveConfirmed: () => { },
                            onLeaveCancelled: () => { },
                        });

                        expect(testGuard.shouldShowWarning()).toBe(true);

                        testGuard.disable();
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('removes beforeunload handler when disabled', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 20 }),
                    fc.boolean(),
                    (studentCount, isTeacher) => {
                        removeEventListenerSpy.mockClear();

                        const testGuard = new SessionCloseGuard();
                        testGuard.enable({
                            isTeacher,
                            studentCount,
                            onLeaveConfirmed: () => { },
                            onLeaveCancelled: () => { },
                        });

                        testGuard.disable();

                        expect(removeEventListenerSpy).toHaveBeenCalledWith(
                            'beforeunload',
                            expect.any(Function)
                        );
                        expect(testGuard.isActive()).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Leave Request Handling', () => {
        it('teacher with students should show modal', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 20 }),
                    (studentCount) => {
                        const testGuard = new SessionCloseGuard();
                        testGuard.enable({
                            isTeacher: true,
                            studentCount,
                            onLeaveConfirmed: () => { },
                            onLeaveCancelled: () => { },
                        });

                        const result = testGuard.handleLeaveRequest();
                        expect(result.shouldShowModal).toBe(true);
                        expect(result.studentCount).toBe(studentCount);

                        testGuard.disable();
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('teacher without students should not show modal', () => {
            const testGuard = new SessionCloseGuard();
            testGuard.enable({
                isTeacher: true,
                studentCount: 0,
                onLeaveConfirmed: () => { },
                onLeaveCancelled: () => { },
            });

            const result = testGuard.handleLeaveRequest();
            expect(result.shouldShowModal).toBe(false);

            testGuard.disable();
        });

        it('student should not show modal', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 20 }),
                    (studentCount) => {
                        const testGuard = new SessionCloseGuard();
                        testGuard.enable({
                            isTeacher: false,
                            studentCount,
                            onLeaveConfirmed: () => { },
                            onLeaveCancelled: () => { },
                        });

                        const result = testGuard.handleLeaveRequest();
                        expect(result.shouldShowModal).toBe(false);

                        testGuard.disable();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Callbacks', () => {
        it('confirmLeave calls onLeaveConfirmed and disables guard', () => {
            const onLeaveConfirmed = vi.fn();
            const onLeaveCancelled = vi.fn();

            guard.enable({
                isTeacher: true,
                studentCount: 5,
                onLeaveConfirmed,
                onLeaveCancelled,
            });

            guard.confirmLeave();

            expect(onLeaveConfirmed).toHaveBeenCalledTimes(1);
            expect(onLeaveCancelled).not.toHaveBeenCalled();
            expect(guard.isActive()).toBe(false);
        });

        it('cancelLeave calls onLeaveCancelled', () => {
            const onLeaveConfirmed = vi.fn();
            const onLeaveCancelled = vi.fn();

            guard.enable({
                isTeacher: true,
                studentCount: 5,
                onLeaveConfirmed,
                onLeaveCancelled,
            });

            guard.cancelLeave();

            expect(onLeaveCancelled).toHaveBeenCalledTimes(1);
            expect(onLeaveConfirmed).not.toHaveBeenCalled();
            expect(guard.isActive()).toBe(true);

            guard.disable();
        });
    });

    describe('Student Count Updates', () => {
        it('updateStudentCount changes the count', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 10 }),
                    fc.integer({ min: 0, max: 10 }),
                    (initialCount, newCount) => {
                        const testGuard = new SessionCloseGuard();
                        testGuard.enable({
                            isTeacher: true,
                            studentCount: initialCount,
                            onLeaveConfirmed: () => { },
                            onLeaveCancelled: () => { },
                        });

                        expect(testGuard.getStudentCount()).toBe(initialCount);

                        testGuard.updateStudentCount(newCount);

                        expect(testGuard.getStudentCount()).toBe(newCount);

                        testGuard.disable();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
