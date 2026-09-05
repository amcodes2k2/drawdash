import { useRef, useEffect } from "react";

import { restoreCanvasOnJoin, handleMouseDown, handleMouseMove } from "../helpers/canvas.js";

function Canvas({ gameState, strokeSettings, playerName, canvasRef, pathDrawingHistoryRef, sendRef })
{
    const isDrawingRef = useRef(false);

    useEffect(() => {
        restoreCanvasOnJoin(
            canvasRef,
            pathDrawingHistoryRef
        );
    }, []);

    return (
        <canvas 
            width={800}
            height={500}
            ref={canvasRef}
            className={
                `rounded-sm bg-white w-[62%] ${playerName !== gameState.sketcherName ? "pointer-events-none" : ""}`
            }
            onMouseDown={(event) => {
                if(playerName !== gameState.sketcherName)
                    return;

                handleMouseDown(
                    event.clientX,
                    event.clientY, 
                    canvasRef,
                    isDrawingRef, 
                    pathDrawingHistoryRef,
                    strokeSettings
                );
            }}
            onMouseMove={(event) => {
                if(playerName !== gameState.sketcherName || isDrawingRef.current === false)
                    return;

                handleMouseMove(
                    event.clientX,
                    event.clientY,
                    canvasRef,
                    pathDrawingHistoryRef,
                    sendRef
                );
            }}
            onMouseUp={(event) => {
                if(playerName !== gameState.sketcherName)
                    return;

                isDrawingRef.current = false;
            }}
            onMouseOut={(event) => {
                if(playerName !== gameState.sketcherName)
                    return;

                isDrawingRef.current = false;
            }}
        >
        </canvas>
    );
}

export default Canvas;