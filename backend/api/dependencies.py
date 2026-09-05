from fastapi import HTTPException, Request, WebSocket
from fastapi.datastructures import Address as ClientAddress

from utils.rate_limiter import RateLimiter

async def handle_http_rate_limiting(request: Request) -> None:
    request_path: str = request.url.path
    client_address: ClientAddress = request.client
    
    rate_limiter: RateLimiter = request.app.state.requests_rate_limiter
    if rate_limiter.is_rate_limit_exceeded(
        key=f"{client_address.host}:{request_path}"
    ) == True:
        raise HTTPException(
            status_code=429,
            detail="Too many requests"
        )

async def handle_websocket_rate_limiting(websocket: WebSocket) -> None:
    request_path: str = websocket.url.path
    client_address: ClientAddress = websocket.client
    
    rate_limiter: RateLimiter = websocket.app.state.requests_rate_limiter
    if rate_limiter.is_rate_limit_exceeded(
        key=f"{client_address.host}:{request_path}"
    ) == True:
        raise HTTPException(
            status_code=429,
            detail="Too many requests"
        )