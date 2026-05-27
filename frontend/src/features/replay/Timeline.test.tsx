/**
 * Vitest tests for the replay Timeline component.
 */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { Timeline } from './Timeline';

describe('Timeline', () => {
    it('renders one tick per event', () => {
        render(<Timeline totalEvents={7} currentSeq={3} onScrub={() => undefined} />);
        const ticks = screen.getAllByTestId('timeline-tick');
        expect(ticks).toHaveLength(7);
        const seqs = ticks.map((t) => Number(t.getAttribute('data-seq')));
        expect(seqs).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('calls onScrub when the slider moves', () => {
        const onScrub = vi.fn();
        render(<Timeline totalEvents={5} currentSeq={0} onScrub={onScrub} />);
        const slider = screen.getByLabelText(/replay timeline/i);
        fireEvent.change(slider, { target: { value: '4' } });
        expect(onScrub).toHaveBeenCalledWith(4);
    });

    it('renders no ticks for an empty event log', () => {
        render(<Timeline totalEvents={0} currentSeq={0} onScrub={() => undefined} />);
        expect(screen.queryAllByTestId('timeline-tick')).toHaveLength(0);
    });
});
