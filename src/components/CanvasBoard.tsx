import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { DrawEvent, Point } from '../types';
import { socketService } from '../services/socketService';

interface CanvasBoardProps {
    isDrawer: boolean;
    currentColor: string;
    lineWidth: number;
    onClearRef?: React.MutableRefObject<() => void>;
}

export const CanvasBoard: React.FC<CanvasBoardProps> = ({
    isDrawer,
    currentColor,
    lineWidth,
    onClearRef
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPoint = useRef<Point | null>(null);

    // Helper to get coordinates relative to canvas
    const getCoordinates = (event: MouseEvent | TouchEvent): Point | null => {
        if (!canvasRef.current) return null;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        let clientX, clientY;

        if ('touches' in event) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = (event as MouseEvent).clientX;
            clientY = (event as MouseEvent).clientY;
        }

        // Scale logic is crucial for responsive canvas
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const drawLine = useCallback((start: Point, end: Point, color: string, width: number) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }, []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    // Expose clear function to parent
    useEffect(() => {
        if (onClearRef) {
            onClearRef.current = () => {
                clearCanvas();
                if (isDrawer) {
                    socketService.emit('clear_canvas', {});
                }
            };
        }
    }, [onClearRef, clearCanvas, isDrawer]);

    // Event Handlers
    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawer) return;
        // e.preventDefault(); // React synthetic events might complain about preventDefault on passive events, but let's see. 
        // Actually, for touch drawing we often need to prevent default to stop scrolling.

        const coords = getCoordinates(e.nativeEvent as MouseEvent | TouchEvent);
        if (coords) {
            setIsDrawing(true);
            lastPoint.current = coords;

            // Draw a dot
            drawLine(coords, coords, currentColor, lineWidth);

            socketService.emit('draw_stroke', {
                start: coords,
                end: coords,
                color: currentColor,
                width: lineWidth,
                isEnd: false
            } as DrawEvent);
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawer || !isDrawing || !lastPoint.current) return;
        // e.preventDefault(); 

        const coords = getCoordinates(e.nativeEvent as MouseEvent | TouchEvent);
        if (coords) {
            drawLine(lastPoint.current, coords, currentColor, lineWidth);

            socketService.emit('draw_stroke', {
                start: lastPoint.current,
                end: coords,
                color: currentColor,
                width: lineWidth,
                isEnd: false
            } as DrawEvent);

            lastPoint.current = coords;
        }
    };

    const handleEnd = () => {
        if (!isDrawer || !isDrawing) return;
        setIsDrawing(false);
        lastPoint.current = null;
        socketService.emit('draw_stroke', { isEnd: true }); // Signal stroke end
    };

    // Socket Listeners for other players
    useEffect(() => {
        const handleRemoteDraw = (data: DrawEvent) => {
            // Only draw if we are NOT the drawer (unless debugging)
            if (!isDrawer && data.start && data.end) {
                drawLine(data.start, data.end, data.color, data.width);
            }
        };

        const handleRemoteClear = () => {
            if (!isDrawer) clearCanvas();
        };

        socketService.on('draw_stroke', handleRemoteDraw);
        socketService.on('clear_canvas', handleRemoteClear);

        return () => {
            socketService.off('draw_stroke', handleRemoteDraw);
            socketService.off('clear_canvas', handleRemoteClear);
        };
    }, [isDrawer, drawLine, clearCanvas]);

    // Set initial resolution once and let CSS handle display scaling
    useEffect(() => {
        if (canvasRef.current && containerRef.current) {
            // Set a fixed high resolution for the canvas "backing store"
            // This prevents data loss during resize (as we don't resize the backing store)
            // and prevents distortion as we maintain a square aspect_ratio in CSS
            canvasRef.current.width = 1000;
            canvasRef.current.height = 1000;

            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden relative cursor-crosshair touch-none">
            <canvas
                ref={canvasRef}
                className="block w-full h-full"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
            />
            {!isDrawer && (
                <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 text-xs rounded pointer-events-none">
                    View Only
                </div>
            )}
        </div>
    );
};
