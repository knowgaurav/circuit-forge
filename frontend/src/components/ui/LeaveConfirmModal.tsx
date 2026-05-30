'use client';

import { AlertTriangle, XCircle } from 'lucide-react';

import { Button } from './Button';
import { Modal } from './Modal';

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
    onCloseSession,
}: LeaveConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onStay} title="Leave Session?" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="bg-warning/15 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">
                            {studentCount === 1
                                ? '1 student is still connected'
                                : `${studentCount} students are still connected`}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">
                            Leaving will disconnect you but keep the session active. Closing will
                            end the session for everyone.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onStay} className="flex-1">
                            Stay
                        </Button>
                        <Button variant="primary" onClick={onLeave} className="flex-1">
                            Leave Session
                        </Button>
                    </div>
                    {onCloseSession && (
                        <Button variant="danger" onClick={onCloseSession} className="w-full">
                            <XCircle className="mr-2 h-4 w-4" />
                            Close Session for Everyone
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
