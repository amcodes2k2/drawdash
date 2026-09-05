import string
from uuid import UUID
from json import JSONDecodeError
from typing import Any, Dict, Union

from pydantic import ValidationError

from fastapi import APIRouter, Depends, Request, Response, WebSocketException, WebSocket, WebSocketDisconnect

from utils.room_manager import RoomManager
from api.dependencies import handle_http_rate_limiting, handle_websocket_rate_limiting
from schemas import CreateRoomRequestBody, CreateRoomResponseBody, ClientWebSocketMessage

router: APIRouter = APIRouter()

@router.post(
    "/rooms",
    status_code=201, 
    response_model=CreateRoomResponseBody,
    dependencies=[Depends(handle_http_rate_limiting)]
)
async def create_room(request: Request, request_body: CreateRoomRequestBody, response: Response):
    room_manager: RoomManager = request.app.state.room_manager

    room_id: UUID = await room_manager.create_room(configs=request_body)
    response_body: Dict[str, Union[str, int, UUID]] = request_body.model_dump()
    response_body["id"] = room_id
    
    response.headers["location"] = f"/rooms/{room_id}"

    return response_body

@router.get(
    "/rooms/{room_id}",
    status_code=200,
    response_model=CreateRoomResponseBody
)
def read_room_properties(request: Request, room_id: UUID):
    room_manager: RoomManager = request.app.state.room_manager
    return room_manager.read_room_properties(room_id=room_id)

@router.websocket(
    "/rooms/{room_id}",
    dependencies=[Depends(handle_websocket_rate_limiting)]
)
async def room_websocket_endpoint(
    room_id: str, 
    player_name: str, 
    websocket: WebSocket
) -> None:
    await websocket.accept()

    try:
        room_id_obj: UUID = UUID(room_id, version=4)
    except ValueError:
        raise WebSocketException(
            code=4003,
            reason="Invalid Room ID"
        )
    
    if len(player_name) < 3 or len(player_name) > 8:
        raise WebSocketException(
            code=4003,
            reason="Player name must be 3 to 8 characters long"
        )
    
    valid_charset: str = string.ascii_letters + string.digits + '_'
    for ch in player_name:
        if ch not in valid_charset:
            raise WebSocketException(
                code=4003,
                reason="Player name must consist of alphabetical characters, digits and underscores only"
            )
        
    room_manager: RoomManager = websocket.app.state.room_manager
    await room_manager.add_to_room(
        room_id=room_id_obj, 
        player_name=player_name, 
        websocket=websocket
    )

    try:
        while True:
            try:
                payload: Dict[Any, Any] = await websocket.receive_json()
            except JSONDecodeError:
                continue

            try:
                message: ClientWebSocketMessage = ClientWebSocketMessage(payload=payload)
            except ValidationError:
                continue    
                
            await room_manager.send_message_to_room(
                room_id=room_id_obj,
                sender_name=player_name,
                message=message
            )
    except WebSocketDisconnect:
        pass
    finally:
        await room_manager.remove_from_room(
            room_id=room_id_obj, 
            player_name=player_name
        )