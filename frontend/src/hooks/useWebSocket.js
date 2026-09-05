import { useRef, useCallback, useEffect } from "react";

function classifyClose(code)
{
  switch (code) 
  {
    case 1000:
    case 1001:
      return "normal";
    case 1006:
    case 1011:
    case 1012:
    case 1013:
      return "transient";
    case 1002:
    case 1003:
    case 1008:
      return "permanent";
    default:
      return code >= 4000 ? "application" : "transient";
  }
}

function useWebSocket(url, options = {})
{
    const wsRef = useRef(null);
    const { onOpen, onClose, onMessage, reconnect = true } = options;

    const attemptsRef = useRef(0);
    const reconnectTimerRef = useRef(null);

    const connect = useCallback(() => {
        const socket = new WebSocket(url);
        wsRef.current = socket;

        socket.onopen = () => {
            attemptsRef.current = 0;
            onOpen?.();
        };

        socket.onmessage = (event) => {
            onMessage?.(JSON.parse(event.data));
        };

        socket.onclose = (event) => {
            const closeType = classifyClose(event.code); 
            onClose?.(event.code, event.reason, closeType);

            if(reconnect === true && closeType === "transient")
                scheduleReconnect();
        };

        socket.onerror = (event) => {
            socket.close();
        };
    }, [url, onOpen, onClose, onMessage, reconnect]);

    const scheduleReconnect = useCallback(() => {
        const attempts = attemptsRef.current;
        if(attempts >= 10)
        {
            onClose?.(
                null,
                "Unable to reach the server",
                "permanent"
            );
            
            return;
        }

        const jitter = Math.random() * 1000;
        const baseDelay = Math.min(1000 * 2 ** attempts, 30000);
        const delay = baseDelay + jitter;

        reconnectTimerRef.current = setTimeout(() => {
            attemptsRef.current += 1;
            connect();
        }, delay);
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            clearTimeout(reconnectTimerRef.current);
            wsRef.current?.close(1000, "hook cleanup");
        };
    }, [connect]);

    const send = useCallback((payload) => {
        if(wsRef.current?.readyState === WebSocket.OPEN)
            wsRef.current.send(JSON.stringify(payload));
    }, []);

    return { send, wsRef };
}

export default useWebSocket;

/*
Notes:

The WebSocket() constructor returns a new WebSocket object and immediately attempts to establish a connection asynchronously to the specified WebSocket URL.

If the connection cannot be established (for example, the server is unreachable or the handshake fails), an error event fires and is followed by a close event whose wasClean property is false — so every connection attempt ultimately ends with either an open event or a close event.

The WebSocket.readyState read-only property returns the current state of the WebSocket connection.

WebSocket.CONNECTING (0)
Socket has been created. The connection is not yet open.

WebSocket.OPEN (1)
The connection is open and ready to communicate.

WebSocket.CLOSING (2)
The connection is in the process of closing.

WebSocket.CLOSED (3)
The connection is closed or couldn't be opened.

Calling send() before the open event fires throws an InvalidStateError exception, because readyState is still CONNECTING.

Never create a WebSocket inside a component body or with useState. A WebSocket connection is not render state. You never want the UI to re-render because the socket object changed (eg -> when the socket reconnects). The Right Way: useRef for the Socket Instance.

Custom Hook: useWebSocket

Encapsulate connection, reconnection, and cleanup in a reusable hook. This is the pattern that scales across a real application.

useCallback caches a function definition so that it is not recreated from scratch every single time the component re-renders or when it is passed to the child components.

The reconnection logic uses exponential backoff with jitter. Start at 1000ms, double each time, cap at 30 seconds. The jitter multiplier randomizes each delay.

Why jitter matters: when a server restarts, every connected client disconnects at the same instant. Without jitter, all clients retry at exactly the same intervals — 1s, 2s, 4s — and every retry wave hits the recovering server simultaneously. This is the thundering herd problem, and it can keep a server down longer than the original failure. Jitter spreads reconnection attempts across time. It costs you a few lines of code and prevents cascading failures.
*/