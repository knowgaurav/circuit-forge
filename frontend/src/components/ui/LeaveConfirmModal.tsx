'use client';

import { AlertTriangle, XCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface LeaveConfirmModalProps {
    isOpen: boolean;
    studentCount: number;
    onStay: () => void;
    onLeave: () => void;
    onCloseSession?: (() => void | Promise<void>) | undefined;
}

export function LeaveConfirmModal({
    isOpen,
    studentCount,
    onStay,
    onLeave,
    onCloseSession
}: LeaveConfirmModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onStay}
            title="Leave Session?"
            size="sm"
        >
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-gray-900 dark:text-white font-medium">
                            {studentCount === 1
                                ? '1 student is still connected'
                                : `${studentCount} students are still connected`
                            }
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Leaving will disconnect you but keep the session active.
                            Closing will end the session for everyone.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={onStay}
                            className="flex-1"
                        >
                            Stay
                        </Button>
                        <Button
                            variant="primary"
                            onClick={onLeave}
                            className="flex-1"
                        >
                            Leave Session
                        </Button>
                    </div>
                    {onCloseSession && (
                        <Button
                            variant="danger"
                            onClick={onCloseSession}
                            className="w-full"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Close Session for Everyone
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
