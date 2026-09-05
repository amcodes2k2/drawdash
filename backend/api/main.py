from fastapi import APIRouter

from api.routes import rooms

api_router: APIRouter = APIRouter()
api_router.include_router(rooms.router)