import { sendLineSegmentEndpoints, sendUndoStrokeMessage, sendClearCanvasMessage } from "./transport.js";

function getMousePosition(canvasRef, clientX, clientY)
{
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function drawLineSegment(canvasRef, endpoint1, endpoint2, strokeSettings)
{
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.moveTo(endpoint1.x, endpoint1.y);
    ctx.lineTo(endpoint2.x, endpoint2.y);
    ctx.lineWidth = strokeSettings.width;
    ctx.strokeStyle = strokeSettings.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.closePath();
}

function restoreCanvasOnJoin(canvasRef, pathDrawingHistoryRef)
{
    if(canvasRef.current == null)
        return;

    for(let i = 0; i < pathDrawingHistoryRef.current.length; i++)
    {
        const path = pathDrawingHistoryRef.current[i];
        for(let j = 1; j < path.points.length; j++)
            drawLineSegment(canvasRef, path.points[j - 1], path.points[j], path.strokeSettings);
    }
}

function handleMouseDown(
    clientX, 
    clientY, 
    canvasRef, 
    isDrawingRef, 
    pathDrawingHistoryRef, 
    strokeSettings,
    shouldBroadcast = true
)
{
    if(shouldBroadcast === true && canvasRef.current == null)
        return;

    const mousePosition = shouldBroadcast === true ? 
    getMousePosition(canvasRef, clientX, clientY) : { x: clientX, y: clientY };

    if(shouldBroadcast === true)
        isDrawingRef.current = true;

    pathDrawingHistoryRef.current.push({
        strokeSettings: strokeSettings,
        points: [{
            x: mousePosition.x, 
            y: mousePosition.y
        }]
    });
}

function handleMouseMove(
    clientX, 
    clientY, 
    canvasRef, 
    pathDrawingHistoryRef, 
    sendRef,
    shouldBroadcast = true
)
{
    if((shouldBroadcast === true && canvasRef.current == null) || pathDrawingHistoryRef.current.length === 0)
        return;

    const latestPath = pathDrawingHistoryRef.current[pathDrawingHistoryRef.current.length - 1];
    if(latestPath.points.length === 0)
        return;

    const strokeSettings = latestPath.strokeSettings;
    const endpoint1 = latestPath.points[latestPath.points.length - 1];
    const endpoint2 = shouldBroadcast === true ? 
    getMousePosition(canvasRef, clientX, clientY) : { x: clientX, y: clientY };

    if(shouldBroadcast === true)
    {
        const pathStart = (latestPath.points.length === 1) ? 
        true : false;
        sendLineSegmentEndpoints(
            sendRef,
            pathStart,
            strokeSettings,
            endpoint1,
            endpoint2
        );
    }

    if(canvasRef.current != null)
        drawLineSegment(canvasRef, endpoint1, endpoint2, strokeSettings);

    latestPath.points.push({
        x: endpoint2.x, 
        y: endpoint2.y
    });
}

function handleUndoStroke(canvasRef, pathDrawingHistoryRef, sendRef, shouldBroadcast = true)
{
    if((shouldBroadcast === true && canvasRef.current == null) || pathDrawingHistoryRef.current.length === 0)
        return;

    if(shouldBroadcast === true)
        sendUndoStrokeMessage(sendRef);

    pathDrawingHistoryRef.current.pop();
    if(canvasRef.current != null)
    {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        restoreCanvasOnJoin(canvasRef, pathDrawingHistoryRef);
    }
}

function handleClearCanvas(canvasRef, pathDrawingHistoryRef, sendRef, shouldBroadcast = true)
{
    if((shouldBroadcast === true && canvasRef.current == null) || pathDrawingHistoryRef.current.length === 0)
        return;

    if(shouldBroadcast === true)
        sendClearCanvasMessage(sendRef);

    pathDrawingHistoryRef.current.length = 0;
    if(canvasRef.current != null)
    {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

export { 
    restoreCanvasOnJoin,
    handleMouseDown, 
    handleMouseMove, 
    handleUndoStroke, 
    handleClearCanvas 
};