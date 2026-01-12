/**
 * @file GridRenderer.ts
 * @description Pure function for drawing the canvas grid background
 * @module features/canvas/renderers
 */

import type { Position } from '@/types';

/**
 * Draws a grid background on the canvas with minor and major grid lines.
 * Uses different styling for dark/light mode.
 */
export function drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    panOffset: Position,
    zoom: number,
    isDarkMode = false
): void {
    const gridSize = 5;

    // Calculate visible area in canvas coordinates
    const startX = Math.floor(-panOffset.x / zoom / gridSize) * gridSize - gridSize;
    const startY = Math.floor(-panOffset.y / zoom / gridSize) * gridSize - gridSize;
    const endX = startX + width / zoom + gridSize * 4;
    const endY = startY + height / zoom + gridSize * 4;

    // Draw minor grid lines
    ctx.strokeStyle = isDarkMode ? '#374151' : '#E2E8F0';
    ctx.lineWidth = 0.5;
    for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }

    // Major grid lines every 10 cells (50px)
    ctx.strokeStyle = isDarkMode ? '#4b5563' : '#CBD5E1';
    ctx.lineWidth = 1;
    const majorGridSize = gridSize * 10;
    const majorStartX = Math.floor(startX / majorGridSize) * majorGridSize;
    const majorStartY = Math.floor(startY / majorGridSize) * majorGridSize;

    for (let x = majorStartX; x < endX; x += majorGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    for (let y = majorStartY; y < endY; y += majorGridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
}
