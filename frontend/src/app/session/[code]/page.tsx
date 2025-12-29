'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    MousePointer2, Hand, Pencil, Eraser, Undo2, Redo2,
    Copy, Check, Link2, LogOut, Download, Upload, Image, Spline, Trash2,
    ZoomIn, ZoomOut, ChevronDown, X, UserMinus, ShieldOff
} from 'lucide-react';

import {
    Button, IconButton, Input, Modal, Panel, Badge,
    Avatar, ColorPicker, Spinner, Tooltip, ToastContainer, ToastItem,
    ThemeToggle, LeaveConfirmModal
} from '@/components/ui';
import { Canvas, SimulationOverlay } from '@/components/circuit';
import { ComponentPalette } from '@/components/circuit/ComponentPalette';
import { createComponentInstance, ComponentDefinition } from '@/constants/components';
import { useCircuitStore, useSessionStore, useUIStore, Tool } from '@/stores';
import { useCloseGuard, useSessionRecovery } from '@/hooks';
import { api } from '@/services/api';
import { WebSocketClient } from '@/services/websocket';
import { exportAsPng, exportAsJson, importFromJson } from '@/services/export';
import type { SimulationResult } from '@/services/simulation';
import type { ServerMessage, Position, Annotation, Participant } from '@/types';

export default function SessionPage() {
    const params = useParams();
    const router = useRouter();
    const code = (params.code as string).toUpperCase();

    // Stores
    const circuitStore = useCircuitStore();
    const sessionStore = useSessionStore();
    const uiStore = useUIStore();

    // Local state
    const [isLoading, setIsLoading] = useState(true);
    const [showNameModal, setShowNameModal] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [nameError, setNameError] = useState('');
    const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [copied, setCopied] = useState<'code' | 'link' | null>(null);
    const [draggingComponent, setDraggingComponent] = useState<ComponentDefinition | null>(null);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isSimulationRunning, setIsSimulationRunning] = useState(false);
    const [remoteSimulationResult, setRemoteSimulationResult] = useState<SimulationResult | null>(null);
    const [showZoomDropdown, setShowZoomDropdown] = useState(false);
    const [editingLabel, setEditingLabel] = useState<{ componentId: string; label: string } | null>(null);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveModalStudentCount, setLeaveModalStudentCount] = useState(0);

    // Session recovery hook
    const { saveSession } = useSessionRecovery();

    // Zoom presets
    const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400];

    // Sidebar state
    const [leftSidebarWidth, setLeftSidebarWidth] = useState(256);
    const [rightSidebarWidth, setRightSidebarWidth] = useState(288);
    const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
    const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
    const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);

    // Toast helper with deduplication
    const addToast = useCallback((type: ToastItem['type'], message: string) => {
        setToasts((prev) => {
            // Check if the same message already exists (prevent duplicates)
            const isDuplicate = prev.some((t) => t.message === message && t.type === type);
            if (isDuplicate) {
                return prev;
            }
            const id = `toast-${Date.now()}`;
            return [...prev, { id, type, message }];
        });
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Sidebar resize handlers
    const handleResizeMouseDown = (side: 'left' | 'right') => (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(side);
    };

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        if (isResizing === 'left') {
            // Account for toolbar width (48px)
            const newWidth = Math.max(200, Math.min(400, e.clientX - 48));
            setLeftSidebarWidth(newWidth);
        } else if (isResizing === 'right') {
            const newWidth = Math.max(200, Math.min(400, window.innerWidth - e.clientX));
            setRightSidebarWidth(newWidth);
        }
    }, [isResizing]);

    const handleResizeMouseUp = useCallback(() => {
        setIsResizing(null);
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMouseMove);
            document.addEventListener('mouseup', handleResizeMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            return () => {
                document.removeEventListener('mousemove', handleResizeMouseMove);
                document.removeEventListener('mouseup', handleResizeMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
        return undefined;
    }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

    // Handle WebSocket messages
    const handleMessage = useCallback((message: ServerMessage) => {
        switch (message.type) {
            case 'sync:state':
                circuitStore.setCircuitState(message.payload.circuit);
                sessionStore.setParticipants(message.payload.participants);
                break;
            case 'circuit:component:added':
                circuitStore.addComponent(message.payload.component);
                break;
            case 'circuit:component:moved':
                circuitStore.moveComponent(message.payload.componentId, message.payload.position);
                break;
            case 'circuit:component:deleted':
                circuitStore.deleteComponent(message.payload.componentId);
                break;
            case 'circuit:wire:added':
                circuitStore.addWire(message.payload.wire);
                break;
            case 'circuit:wire:deleted':
                circuitStore.deleteWire(message.payload.wireId);
                break;
            case 'circuit:annotation:added':
                circuitStore.addAnnotation(message.payload.annotation);
                break;
            case 'circuit:annotation:deleted':
                circuitStore.deleteAnnotation(message.payload.annotationId);
                break;
            case 'circuit:state:updated':
                // Re-fetch full state after undo/redo to get the actual changes
                circuitStore.updateVersion(message.payload.version);
                // Request fresh state from server
                api.getCircuit(code).then((state) => {
                    if (state) {
                        circuitStore.setCircuitState(state);
                    }
                }).catch(() => {
                    // Silently fail - state will sync on next action
                });
                break;
            case 'presence:cursor:moved':
                sessionStore.updateRemoteCursor(message.payload.participantId, message.payload.position);
                break;
            case 'presence:selection:changed':
                sessionStore.updateRemoteSelection(message.payload.participantId, message.payload.componentIds);
                break;
            case 'presence:participant:joined':
                sessionStore.addParticipant(message.payload.participant);
                addToast('info', `${message.payload.participant.displayName} joined`);
                break;
            case 'presence:participant:left': {
                const leftParticipant = sessionStore.participants.find((p: { id: string }) => p.id === message.payload.participantId);
                sessionStore.removeParticipant(message.payload.participantId);
                if (leftParticipant) {
                    addToast('info', `${leftParticipant.displayName} left`);
                }
                break;
            }
            case 'permission:request:sent':
                // Confirmation to student that their request was sent
                addToast('info', 'Edit request sent to teacher');
                break;
            case 'permission:request:received':
                sessionStore.addEditRequest({
                    participantId: message.payload.participantId,
                    displayName: message.payload.displayName,
                    requestedAt: new Date().toISOString(),
                    status: 'pending',
                });
                addToast('info', `${message.payload.displayName} requested edit access`);
                break;
            case 'permission:granted':
                sessionStore.updateParticipantEditStatus(message.payload.participantId, true);
                sessionStore.removeEditRequest(message.payload.participantId);
                if (message.payload.participantId === sessionStore.currentParticipant?.id) {
                    addToast('success', 'Edit access granted!');
                }
                break;
            case 'permission:denied':
                sessionStore.removeEditRequest(message.payload.participantId);
                if (message.payload.participantId === sessionStore.currentParticipant?.id) {
                    addToast('warning', 'Edit access denied');
                }
                break;
            case 'permission:revoked':
                sessionStore.updateParticipantEditStatus(message.payload.participantId, false);
                if (message.payload.participantId === sessionStore.currentParticipant?.id) {
                    addToast('warning', 'Edit access revoked');
                }
                break;
            case 'session:kicked':
                // Current user was kicked from the session
                addToast('error', 'You have been removed from the session');
                wsClient?.disconnect();
                router.push('/');
                break;
            case 'presence:participant:kicked':
                // Another participant was kicked
                sessionStore.removeParticipant(message.payload.participantId);
                addToast('info', `${message.payload.displayName} was removed from the session`);
                break;
            case 'simulation:started':
                setIsSimulationRunning(true);
                addToast('info', 'Simulation started');
                break;
            case 'simulation:stopped':
                setIsSimulationRunning(false);
                setRemoteSimulationResult(null);
                setSimulationResult(null);
                addToast('info', 'Simulation stopped');
                break;
            case 'simulation:state:updated':
                setIsSimulationRunning(message.payload.isRunning);
                if (message.payload.isRunning) {
                    const result: SimulationResult = {
                        success: message.payload.errors.length === 0,
                        wireStates: message.payload.wireStates as Record<string, 'HIGH' | 'LOW' | 'UNDEFINED' | 'ERROR'>,
                        pinStates: message.payload.pinStates as Record<string, Record<string, 'HIGH' | 'LOW' | 'UNDEFINED' | 'ERROR'>>,
                        errors: message.payload.errors,
                    };
                    setRemoteSimulationResult(result);
                    setSimulationResult(result);
                }
                break;
            case 'error':
                addToast('error', message.payload.message);
                break;
        }
    }, [circuitStore, sessionStore, addToast]);

    // Initialize session
    useEffect(() => {
        const initSession = async () => {
            try {
                // Check if session exists
                const sessionInfo = await api.getSession(code);
                if (!sessionInfo.exists) {
                    addToast('error', 'Session not found or expired');
                    router.push('/');
                    return;
                }

                // Check for existing participant ID and name
                const existingId = localStorage.getItem(`participant_${code}`);
                const existingName = localStorage.getItem(`participant_name_${code}`);
                if (existingId && existingName) {
                    // Try to rejoin with existing ID and name
                    try {
                        const { participant } = await api.joinSession(code, existingName, existingId);
                        sessionStore.setCurrentParticipant(participant);
                        connectWebSocket(existingId);
                    } catch {
                        // Need new name - clear old data
                        localStorage.removeItem(`participant_${code}`);
                        localStorage.removeItem(`participant_name_${code}`);
                        setShowNameModal(true);
                    }
                } else {
                    setShowNameModal(true);
                }
            } catch (error) {
                addToast('error', 'Failed to load session');
                router.push('/');
            } finally {
                setIsLoading(false);
            }
        };

        initSession();

        return () => {
            wsClient?.disconnect();
            circuitStore.reset();
            sessionStore.reset();
            uiStore.reset();
        };
    }, [code]);

    const connectWebSocket = (participantId: string) => {
        const client = new WebSocketClient({
            onMessage: handleMessage,
            onConnect: () => {
                sessionStore.setConnectionStatus(true, false);
                addToast('success', 'Connected');
            },
            onDisconnect: () => {
                sessionStore.setConnectionStatus(false, false);
            },
            onReconnecting: () => {
                sessionStore.setConnectionStatus(false, true);
                addToast('warning', 'Reconnecting...');
            },
        });

        client.connect(code, participantId);
        setWsClient(client);
    };

    const handleJoinWithName = async (e: React.FormEvent) => {
        e.preventDefault();
        setNameError('');

        if (displayName.length < 3 || displayName.length > 20) {
            setNameError('Name must be 3-20 characters');
            return;
        }

        if (!/^[a-zA-Z0-9 ]+$/.test(displayName)) {
            setNameError('Only letters, numbers, and spaces allowed');
            return;
        }

        try {
            // Check if we have an existing participant ID (creator case)
            const existingId = localStorage.getItem(`participant_${code}`);
            const { participant } = await api.joinSession(code, displayName, existingId || undefined);
            localStorage.setItem(`participant_${code}`, participant.id);
            localStorage.setItem(`participant_name_${code}`, displayName);
            sessionStore.setCurrentParticipant(participant);
            setShowNameModal(false);
            connectWebSocket(participant.id);
        } catch (error) {
            setNameError(error instanceof Error ? error.message : 'Failed to join');
        }
    };

    const handleCopy = async (type: 'code' | 'link') => {
        const text = type === 'code' ? code : window.location.href;
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleToolSelect = (tool: Tool) => {
        uiStore.setSelectedTool(tool);
    };

    const handleUndo = () => wsClient?.undo();
    const handleRedo = () => wsClient?.redo();

    const handleDeleteSelected = () => {
        if (uiStore.selectedComponentIds.length === 0) return;
        uiStore.selectedComponentIds.forEach((id: string) => {
            wsClient?.deleteComponent(id);
        });
        uiStore.clearSelection();
    };

    const handleZoomIn = () => {
        const currentPercent = Math.round(uiStore.zoom * 100);
        const nextPreset = ZOOM_PRESETS.find(p => p > currentPercent);
        if (nextPreset) {
            uiStore.setZoom(nextPreset / 100);
        }
    };

    const handleZoomOut = () => {
        const currentPercent = Math.round(uiStore.zoom * 100);
        const prevPreset = [...ZOOM_PRESETS].reverse().find(p => p < currentPercent);
        if (prevPreset) {
            uiStore.setZoom(prevPreset / 100);
        }
    };

    const handleZoomPreset = (percent: number) => {
        uiStore.setZoom(percent / 100);
        setShowZoomDropdown(false);
    };

    const handleComponentMove = (componentId: string, position: Position) => {
        wsClient?.moveComponent(componentId, position);
    };

    const handleAnnotationCreate = (annotation: Annotation) => {
        wsClient?.addAnnotation(annotation);
    };

    const handleComponentDrop = (position: Position) => {
        if (!draggingComponent || !canEdit) return;
        // Get existing labels to avoid duplicates
        const existingLabels = circuitStore.components.map(c => c.label).filter(Boolean);
        const component = createComponentInstance(draggingComponent.type, position, existingLabels);
        if (component) {
            wsClient?.addComponent(component);
        }
        setDraggingComponent(null);
    };

    const handleComponentAdd = (component: unknown) => {
        wsClient?.addComponent(component);
    };

    const handleComponentLabelEdit = (componentId: string, currentLabel: string) => {
        if (!canEdit) return;
        setEditingLabel({ componentId, label: currentLabel });
    };

    const handleLabelSave = () => {
        if (!editingLabel) return;
        // Update the component label in the store
        circuitStore.updateComponentLabel(editingLabel.componentId, editingLabel.label);
        // TODO: Send label update via WebSocket when backend supports it
        setEditingLabel(null);
    };

    const handleWireCreate = (fromComponentId: string, fromPinId: string, toComponentId: string, toPinId: string) => {
        const wire = {
            id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fromComponentId,
            fromPinId,
            toComponentId,
            toPinId,
            waypoints: [],
        };
        wsClient?.addWire(wire);
    };

    const handleComponentDelete = (componentId: string) => {
        wsClient?.deleteComponent(componentId);
    };

    const handleWireDelete = (wireId: string) => {
        wsClient?.deleteWire(wireId);
    };

    const handleLeave = () => {
        // Check if we need to show confirmation modal (teacher with students)
        const studentCount = sessionStore.participants.filter(
            (p: Participant) => p.role === 'student' && p.isActive
        ).length;

        if (sessionStore.currentParticipant?.role === 'teacher' && studentCount > 0) {
            setLeaveModalStudentCount(studentCount);
            setShowLeaveModal(true);
            return;
        }

        // Save session for recovery before leaving
        if (sessionStore.currentParticipant) {
            saveSession(
                code,
                sessionStore.currentParticipant.id,
                sessionStore.currentParticipant.displayName
            );
        }

        wsClient?.disconnect();
        router.push('/');
    };

    const handleConfirmLeave = () => {
        setShowLeaveModal(false);
        wsClient?.disconnect();
        router.push('/');
    };

    const handleCancelLeave = () => {
        setShowLeaveModal(false);
    };

    const handleCloseSession = async () => {
        if (!sessionStore.currentParticipant) return;

        try {
            await api.closeSession(code, sessionStore.currentParticipant.id);
            // Clear local storage for this session
            localStorage.removeItem(`participant_${code}`);
            localStorage.removeItem(`participant_name_${code}`);
            setShowLeaveModal(false);
            wsClient?.disconnect();
            addToast('success', 'Session closed');
            router.push('/');
        } catch (error) {
            addToast('error', 'Failed to close session');
        }
    };

    const handleExportPng = async () => {
        try {
            await exportAsPng(
                circuitStore.components,
                circuitStore.wires,
                circuitStore.annotations,
                `circuit-${code}.png`
            );
            addToast('success', 'Circuit exported as PNG');
        } catch (error) {
            addToast('error', 'Failed to export PNG');
        }
    };

    const handleExportJson = () => {
        try {
            exportAsJson(
                {
                    sessionId: code,
                    version: circuitStore.version,
                    schemaVersion: '1.0.0',
                    components: circuitStore.components,
                    wires: circuitStore.wires,
                    annotations: circuitStore.annotations,
                    updatedAt: new Date().toISOString(),
                },
                `circuit-${code}.json`
            );
            addToast('success', 'Circuit exported as JSON');
        } catch (error) {
            addToast('error', 'Failed to export JSON');
        }
    };

    const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const circuitState = await importFromJson(file);
            // Import each component and wire via WebSocket
            circuitState.components.forEach(comp => {
                wsClient?.addComponent(comp);
            });
            circuitState.wires.forEach(wire => {
                wsClient?.addWire(wire);
            });
            addToast('success', 'Circuit imported successfully');
        } catch (error) {
            addToast('error', error instanceof Error ? error.message : 'Failed to import circuit');
        }

        // Reset file input
        e.target.value = '';
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleRedo();
                    } else {
                        handleUndo();
                    }
                } else if (e.key === 'y') {
                    e.preventDefault();
                    handleRedo();
                } else if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    handleZoomIn();
                } else if (e.key === '-') {
                    e.preventDefault();
                    handleZoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    uiStore.setZoom(1); // Reset to 100%
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                // Delete selected components
                uiStore.selectedComponentIds.forEach((id: string) => {
                    wsClient?.deleteComponent(id);
                });
                uiStore.clearSelection();
            } else if (e.key === 'Escape') {
                uiStore.clearSelection();
                uiStore.setSelectedTool('select');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [wsClient, uiStore.selectedComponentIds]);

    // Extract session state for hooks (must be before any conditional returns)
    const { currentParticipant, participants, isConnected, isReconnecting, editRequests } = sessionStore;
    const canEdit = currentParticipant?.canEdit ?? false;
    const isTeacher = currentParticipant?.role === 'teacher';
    const activeStudentCount = participants.filter(
        (p: Participant) => p.role === 'student' && p.isActive
    ).length;

    // Close guard hook - warns before closing tab when in active session
    // Must be called before any conditional returns to follow Rules of Hooks
    useCloseGuard({
        isActive: isConnected && !!currentParticipant,
        isTeacher,
        studentCount: activeStudentCount,
        onLeaveConfirmed: () => {
            wsClient?.disconnect();
            router.push('/');
        },
        onLeaveCancelled: () => { },
    });

    const pendingRequests = editRequests.filter(r => r.status === 'pending');

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between relative z-50">
                <div className="flex items-center gap-4">
                    <h1 className="font-semibold text-gray-900 dark:text-white">CircuitForge</h1>
                    <div className="flex items-center gap-2">
                        <Badge variant={isConnected ? 'success' : isReconnecting ? 'warning' : 'danger'}>
                            {isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected'}
                        </Badge>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Session: {code}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Simulation Controls */}
                    <SimulationOverlay
                        canSimulate={canEdit}
                        isRunning={isSimulationRunning}
                        remoteResult={remoteSimulationResult}
                        onStart={() => wsClient?.startSimulation()}
                        onStop={() => wsClient?.stopSimulation()}
                        onSimulationResult={(result) => {
                            setSimulationResult(result);
                            // Users with edit permission broadcast simulation state to all participants
                            if (canEdit && result && wsClient) {
                                wsClient.sendSimulationState(
                                    result.wireStates as Record<string, string>,
                                    result.pinStates as Record<string, Record<string, string>>,
                                    result.errors
                                );
                            }
                        }}
                        onSimulationStateChange={setIsSimulationRunning}
                    />

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

                    {/* Export/Import */}
                    <Tooltip content="Export as PNG" position="bottom">
                        <IconButton
                            icon={<Image className="w-4 h-4" />}
                            onClick={handleExportPng}
                            aria-label="Export PNG"
                        />
                    </Tooltip>
                    <Tooltip content="Export as JSON" position="bottom">
                        <IconButton
                            icon={<Download className="w-4 h-4" />}
                            onClick={handleExportJson}
                            aria-label="Export JSON"
                        />
                    </Tooltip>
                    {canEdit && (
                        <Tooltip content="Import JSON" position="bottom">
                            <label className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImportJson}
                                    className="hidden"
                                />
                                <Upload className="w-4 h-4" />
                            </label>
                        </Tooltip>
                    )}

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

                    <Tooltip content="Copy session code" position="bottom">
                        <IconButton
                            icon={copied === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            onClick={() => handleCopy('code')}
                            aria-label="Copy code"
                        />
                    </Tooltip>
                    <Tooltip content="Copy session link" position="bottom">
                        <IconButton
                            icon={copied === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                            onClick={() => handleCopy('link')}
                            aria-label="Copy link"
                        />
                    </Tooltip>
                    <ThemeToggle />
                    <Button variant="ghost" size="sm" onClick={handleLeave}>
                        <LogOut className="w-4 h-4 mr-1" />
                        Leave
                    </Button>
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Toolbar */}
                <div className="w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-2 gap-1">
                    <Tooltip content="Select (V)" position="right">
                        <IconButton
                            icon={<MousePointer2 className="w-5 h-5" />}
                            onClick={() => handleToolSelect('select')}
                            variant={uiStore.selectedTool === 'select' ? 'primary' : 'ghost'}
                            aria-label="Select tool"
                        />
                    </Tooltip>
                    <Tooltip content="Pan (Space)" position="right">
                        <IconButton
                            icon={<Hand className="w-5 h-5" />}
                            onClick={() => handleToolSelect('pan')}
                            variant={uiStore.selectedTool === 'pan' ? 'primary' : 'ghost'}
                            aria-label="Pan tool"
                        />
                    </Tooltip>
                    {canEdit && (
                        <>
                            <Tooltip content="Draw (D)" position="right">
                                <IconButton
                                    icon={<Pencil className="w-5 h-5" />}
                                    onClick={() => handleToolSelect('draw')}
                                    variant={uiStore.selectedTool === 'draw' ? 'primary' : 'ghost'}
                                    aria-label="Draw tool"
                                />
                            </Tooltip>
                            <Tooltip content="Erase (E)" position="right">
                                <IconButton
                                    icon={<Eraser className="w-5 h-5" />}
                                    onClick={() => handleToolSelect('erase')}
                                    variant={uiStore.selectedTool === 'erase' ? 'primary' : 'ghost'}
                                    aria-label="Erase tool"
                                />
                            </Tooltip>
                            <Tooltip content="Wire (W)" position="right">
                                <IconButton
                                    icon={<Spline className="w-5 h-5" />}
                                    onClick={() => handleToolSelect('wire')}
                                    variant={uiStore.selectedTool === 'wire' ? 'primary' : 'ghost'}
                                    aria-label="Wire tool"
                                />
                            </Tooltip>

                            <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 my-1" />

                            <Tooltip content="Delete Selected (Del)" position="right">
                                <IconButton
                                    icon={<Trash2 className="w-5 h-5" />}
                                    onClick={handleDeleteSelected}
                                    variant="ghost"
                                    disabled={uiStore.selectedComponentIds.length === 0}
                                    aria-label="Delete selected"
                                />
                            </Tooltip>
                        </>
                    )}

                    <div className="flex-1" />

                    {canEdit && (
                        <>
                            <Tooltip content="Undo (Ctrl+Z)" position="right">
                                <IconButton
                                    icon={<Undo2 className="w-5 h-5" />}
                                    onClick={handleUndo}
                                    aria-label="Undo"
                                />
                            </Tooltip>
                            <Tooltip content="Redo (Ctrl+Y)" position="right">
                                <IconButton
                                    icon={<Redo2 className="w-5 h-5" />}
                                    onClick={handleRedo}
                                    aria-label="Redo"
                                />
                            </Tooltip>
                        </>
                    )}
                </div>

                {/* Component Palette */}
                {canEdit && (
                    <div
                        className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0 relative transition-all duration-200"
                        style={{ width: leftSidebarCollapsed ? 0 : leftSidebarWidth }}
                    >
                        {!leftSidebarCollapsed && (
                            <>
                                <ComponentPalette
                                    onDragStart={setDraggingComponent}
                                    disabled={!canEdit}
                                />
                                {/* Resize handle */}
                                <div
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 bg-gray-200 dark:bg-gray-700 opacity-0 hover:opacity-100 transition-opacity"
                                    onMouseDown={handleResizeMouseDown('left')}
                                />
                            </>
                        )}
                    </div>
                )}

                {/* Left sidebar collapse toggle */}
                {canEdit && (
                    <button
                        onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
                        className="absolute top-1/2 -translate-y-1/2 z-20 bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-r-md px-2 py-4 shadow-lg transition-colors"
                        style={{ left: leftSidebarCollapsed ? 48 : 48 + leftSidebarWidth }}
                        title={leftSidebarCollapsed ? 'Show Components' : 'Hide Components'}
                    >
                        <span className="text-white text-sm font-bold">
                            {leftSidebarCollapsed ? '»' : '«'}
                        </span>
                    </button>
                )}

                {/* Canvas */}
                <div className="flex-1 min-w-0 relative">
                    <Canvas
                        onComponentMove={handleComponentMove}
                        onAnnotationCreate={handleAnnotationCreate}
                        onComponentDrop={handleComponentDrop}
                        onComponentAdd={handleComponentAdd}
                        onWireCreate={handleWireCreate}
                        onComponentDelete={handleComponentDelete}
                        onWireDelete={handleWireDelete}
                        onComponentLabelEdit={handleComponentLabelEdit}
                        onSwitchToggle={circuitStore.toggleSwitchState}
                        draggingComponent={draggingComponent}
                        simulationResult={simulationResult}
                        isSimulationRunning={isSimulationRunning}
                    />

                    {/* Zoom Controls */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-10">
                        <Tooltip content="Zoom Out" position="top">
                            <IconButton
                                icon={<ZoomOut className="w-4 h-4" />}
                                onClick={handleZoomOut}
                                size="sm"
                                disabled={uiStore.zoom <= 0.25}
                                aria-label="Zoom out"
                            />
                        </Tooltip>

                        {/* Zoom Percentage Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowZoomDropdown(!showZoomDropdown)}
                                className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded min-w-[70px] justify-center"
                            >
                                {Math.round(uiStore.zoom * 100)}%
                                <ChevronDown className="w-3 h-3" />
                            </button>

                            {showZoomDropdown && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowZoomDropdown(false)}
                                    />
                                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[80px]">
                                        {ZOOM_PRESETS.map((percent) => (
                                            <button
                                                key={percent}
                                                onClick={() => handleZoomPreset(percent)}
                                                className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${Math.round(uiStore.zoom * 100) === percent
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                                                    : 'text-gray-700 dark:text-gray-200'
                                                    }`}
                                            >
                                                {percent}%
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <Tooltip content="Zoom In" position="top">
                            <IconButton
                                icon={<ZoomIn className="w-4 h-4" />}
                                onClick={handleZoomIn}
                                size="sm"
                                disabled={uiStore.zoom >= 4}
                                aria-label="Zoom in"
                            />
                        </Tooltip>
                    </div>
                </div>

                {/* Right sidebar collapse toggle */}
                <button
                    onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                    className="absolute top-1/2 -translate-y-1/2 z-20 bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-l-md px-2 py-4 shadow-lg transition-colors"
                    style={{ right: rightSidebarCollapsed ? 0 : rightSidebarWidth }}
                    title={rightSidebarCollapsed ? 'Show Participants' : 'Hide Participants'}
                >
                    <span className="text-white text-sm font-bold">
                        {rightSidebarCollapsed ? '«' : '»'}
                    </span>
                </button>

                {/* Participants Panel */}
                <div
                    className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0 relative transition-all duration-200"
                    style={{ width: rightSidebarCollapsed ? 0 : rightSidebarWidth }}
                >
                    {!rightSidebarCollapsed && (
                        <div className="h-full overflow-y-auto">
                            {/* Resize handle */}
                            <div
                                className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-400 bg-gray-200 dark:bg-gray-700 opacity-0 hover:opacity-100 transition-opacity z-10"
                                onMouseDown={handleResizeMouseDown('right')}
                            />

                            <Panel title="Participants">
                                {/* Pending Requests Section (Teacher only, shown only when there are requests) */}
                                {isTeacher && pendingRequests.length > 0 && (
                                    <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                                                Pending Requests
                                            </span>
                                            <Badge variant="warning" size="sm">
                                                {pendingRequests.length}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2">
                                            {pendingRequests.map((request) => {
                                                const participant = participants.find(p => p.id === request.participantId);
                                                return (
                                                    <div
                                                        key={request.participantId}
                                                        className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700"
                                                    >
                                                        <Avatar
                                                            name={request.displayName}
                                                            color={participant?.color || '#888'}
                                                            size="sm"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                {request.displayName}
                                                            </p>
                                                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                                                Requesting edit access
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Tooltip content="Approve" position="top">
                                                                <IconButton
                                                                    icon={<Check className="w-4 h-4" />}
                                                                    onClick={() => wsClient?.approveEditRequest(request.participantId)}
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-green-600 hover:bg-green-100"
                                                                    aria-label="Approve request"
                                                                />
                                                            </Tooltip>
                                                            <Tooltip content="Deny" position="top">
                                                                <IconButton
                                                                    icon={<X className="w-4 h-4" />}
                                                                    onClick={() => wsClient?.denyEditRequest(request.participantId)}
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-red-600 hover:bg-red-100"
                                                                    aria-label="Deny request"
                                                                />
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Participants List */}
                                <div className="space-y-1">
                                    {participants.map((p: Participant) => {
                                        const hasPendingRequest = pendingRequests.some(r => r.participantId === p.id);
                                        // Skip participants with pending requests (they're shown above)
                                        if (isTeacher && hasPendingRequest) return null;

                                        return (
                                            <div
                                                key={p.id}
                                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
                                            >
                                                <Avatar name={p.displayName} color={p.color} size="sm" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                        {p.displayName}
                                                        {p.id === currentParticipant?.id && ' (You)'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {p.role === 'teacher' ? 'Teacher' : 'Student'}
                                                        {p.canEdit && ' • Can Edit'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {!p.isActive && (
                                                        <Badge variant="default" size="sm">Away</Badge>
                                                    )}
                                                    {/* Teacher controls for students */}
                                                    {isTeacher && p.role === 'student' && p.id !== currentParticipant?.id && (
                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                                                            {/* Revoke edit access */}
                                                            {p.canEdit && (
                                                                <Tooltip content="Revoke edit access" position="top">
                                                                    <IconButton
                                                                        icon={<ShieldOff className="w-3.5 h-3.5" />}
                                                                        onClick={() => wsClient?.revokeEditPermission(p.id)}
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                                                                        aria-label="Revoke edit access"
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                            {/* Kick from session */}
                                                            <Tooltip content="Remove from session" position="top">
                                                                <IconButton
                                                                    icon={<UserMinus className="w-3.5 h-3.5" />}
                                                                    onClick={() => wsClient?.kickParticipant(p.id)}
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                                    aria-label="Remove from session"
                                                                />
                                                            </Tooltip>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Request Edit Access Button (Student only) */}
                                {!canEdit && currentParticipant?.role === 'student' && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => wsClient?.requestEditAccess()}
                                        >
                                            Request Edit Access
                                        </Button>
                                    </div>
                                )}
                            </Panel>

                            {/* Color picker for drawing */}
                            {canEdit && uiStore.selectedTool === 'draw' && (
                                <Panel title="Drawing" className="mt-2">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Color</label>
                                            <ColorPicker
                                                value={uiStore.selectedColor}
                                                onChange={uiStore.setSelectedColor}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Thickness</label>
                                            <div className="flex gap-2">
                                                {[2, 4, 8].map((width) => (
                                                    <button
                                                        key={width}
                                                        className={`w-8 h-8 rounded border flex items-center justify-center ${uiStore.strokeWidth === width
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                                            : 'border-gray-200 dark:border-gray-600'
                                                            }`}
                                                        onClick={() => uiStore.setStrokeWidth(width as 2 | 4 | 8)}
                                                    >
                                                        <div
                                                            className="rounded-full bg-gray-900 dark:bg-gray-100"
                                                            style={{ width: width * 2, height: width * 2 }}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Panel>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Name Modal */}
            <Modal
                isOpen={showNameModal}
                onClose={() => { }}
                title="Enter Your Name"
                size="sm"
            >
                <form onSubmit={handleJoinWithName} className="space-y-4">
                    <Input
                        label="Display Name"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        error={nameError}
                        autoFocus
                    />
                    <Button type="submit" className="w-full">
                        Join Session
                    </Button>
                </form>
            </Modal>

            {/* Label Edit Modal */}
            <Modal
                isOpen={!!editingLabel}
                onClose={() => setEditingLabel(null)}
                title="Edit Component Label"
                size="sm"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleLabelSave(); }} className="space-y-4">
                    <Input
                        label="Component Label"
                        placeholder="e.g., AND1, LED2"
                        value={editingLabel?.label || ''}
                        onChange={(e) => setEditingLabel(prev => prev ? { ...prev, label: e.target.value } : null)}
                        autoFocus
                    />
                    <p className="text-xs text-gray-500">
                        Double-click a component to edit its label. Labels help identify components in error messages.
                    </p>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => setEditingLabel(null)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1">
                            Save
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Leave Confirmation Modal */}
            <LeaveConfirmModal
                isOpen={showLeaveModal}
                studentCount={leaveModalStudentCount}
                onStay={handleCancelLeave}
                onLeave={handleConfirmLeave}
                {...(isTeacher && { onCloseSession: handleCloseSession })}
            />

            {/* Toasts */}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
