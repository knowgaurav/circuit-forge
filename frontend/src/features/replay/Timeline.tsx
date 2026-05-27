'use client';

import React from 'react';
import type { ChangeEvent } from 'react';

export interface TimelineProps {
    totalEvents: number;
    currentSeq: number;
    onScrub: (seq: number) => void;
}

export function Timeline({ totalEvents, currentSeq, onScrub }: TimelineProps) {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onScrub(Number(e.target.value));
    };

    // One tick per event seq (1..totalEvents). Position is a percentage
    // along the slider, so a 0-event session has no ticks and renders an
    // inert slider with min === max.
    const ticks: number[] = [];
    for (let i = 1; i <= totalEvents; i++) ticks.push(i);

    return (
        <div className="w-full">
            <div className="mb-1 flex items-center justify-between">
                <label htmlFor="replay-timeline" className="text-sm font-medium text-gray-700">
                    Replay timeline
                </label>
                <span className="text-sm text-gray-500">{currentSeq}</span>
            </div>
            <div className="relative">
                <input
                    id="replay-timeline"
                    type="range"
                    min={0}
                    max={totalEvents}
                    step={1}
                    value={currentSeq}
                    onChange={handleChange}
                    aria-label="Replay timeline"
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-1 h-2">
                    {ticks.map((seq) => {
                        const left = totalEvents > 0 ? (seq / totalEvents) * 100 : 0;
                        const isCurrent = seq === currentSeq;
                        return (
                            <span
                                key={seq}
                                data-testid="timeline-tick"
                                data-seq={seq}
                                aria-hidden="true"
                                className={
                                    isCurrent
                                        ? 'absolute h-2 w-0.5 bg-blue-600'
                                        : 'absolute h-1 w-px bg-gray-400'
                                }
                                style={{ left: `${left}%` }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
