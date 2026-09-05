from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.main import api_router
from config import Settings, get_settings
from utils.rate_limiter import RateLimiter
from utils.room_manager import RoomManager

settings: Settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.room_manager = RoomManager()
    app.state.requests_rate_limiter = RateLimiter(
        limit=12,
        window_size_in_seconds=3600.0
    )
    yield

    await app.state.room_manager.graceful_shutdown()
    app.state.requests_rate_limiter.cancel_expired_timestamps_cleanup_task()

app = FastAPI(
    lifespan=lifespan,
    title="DrawDash"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_HOST],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/", status_code=200)
def root():
    return {
        "message": "DrawDash backend is up and running..."
    }

app.include_router(router=api_router)