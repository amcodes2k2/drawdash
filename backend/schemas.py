import nh3
import string
from uuid import UUID
from typing import Literal, List, Union, Optional

from pydantic import BaseModel, Field, field_validator

class CreateRoomRequestBody(BaseModel):
    owner_name: str = Field(min_length=3, max_length=8)
    capacity: int = Field(ge=2, le=8)
    draw_time: Literal[15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120]
    rounds: int = Field(ge=2, le=12)
    max_no_of_letters_to_reveal: int = Field(ge=0, le=5)

    @field_validator("owner_name")
    @classmethod
    def validate_owner_name(cls, v: str) -> str:
        valid_charset: str = string.ascii_letters + string.digits + '_'
        for ch in v:
            if ch not in valid_charset:
                raise ValueError("Owner name must consist of alphabetical characters, digits and underscores only")
        
        return v

class CreateRoomResponseBody(CreateRoomRequestBody):
    id: UUID

class PlayerSubroundScore(BaseModel):
    role: Literal["sketcher", "guesser"]
    sketcher_name: str
    score: Optional[int]

class PlayerPublic(BaseModel):
    name: str
    rank: int
    avatar: int
    is_active: bool
    total_score: int
    roundwise_score: List[List[PlayerSubroundScore]]

class PingPayload(BaseModel):
    type: Literal["ping"]

class PongPayload(BaseModel):
    type: Literal["pong"]

class JoinRoomNotificationPayload(BaseModel):
    type: Literal["join_room_notification"]
    player_name: str
    players: List[PlayerPublic]

class LeaveRoomNotificationPayload(BaseModel):
    type: Literal["leave_room_notification"]
    player_name: str
    players: List[PlayerPublic]

class RoomOwnerChangedNotificationPayload(BaseModel):
    type: Literal["room_owner_changed_notification"]
    owner_name: str

class ChatMessagePayload(BaseModel):
    type: Literal["chat_message"]
    content: str

    @field_validator("content")
    @classmethod
    def sanitize_markup(cls, v: str) -> str:    
        return nh3.clean(v)

class AssignedWordPayload(BaseModel):
    type: Literal["assigned_word"]
    rounds_elapsed: int
    word: str
    sketcher_name: str

class AssignedWordHintPayload(BaseModel):
    type: Literal["assigned_word_hint"]
    rounds_elapsed: int
    hinted_word: Optional[str]
    sketcher_name: str

class SubroundEndPayload(BaseModel):
    type: Literal["subround_end"]
    word: Optional[str]
    sketcher_name: Optional[str]
    note: Optional[str]
    genai_judge_comment: Optional[str]
    rounds_elapsed: int
    players: List[PlayerPublic]

class ClientStartGamePayload(BaseModel):
    type: Literal["start_game"]

class ServerStartGamePayload(BaseModel):
    type: Literal["start_game"]
    players: List[PlayerPublic]

class NewRoundPayload(BaseModel):
    type: Literal["new_round"]
    rounds_elapsed: int

class StrokeSettings(BaseModel):
    width: Literal[2, 4, 6, 8]
    color: Literal[
        "rgb(255, 255, 255)",
        "rgb(193, 193, 193)",
        "rgb(239, 19, 11)",
        "rgb(255, 113, 0)",
        "rgb(255, 228, 0)",
        "rgb(0, 204, 0)",
        "rgb(0, 255, 145)",
        "rgb(0, 178, 255)",
        "rgb(35, 31, 211)",
        "rgb(163, 0, 186)",
        "rgb(223, 105, 167)",
        "rgb(255, 172, 142)",
        "rgb(160, 82, 45)",
        "rgb(0, 0, 0)",
        "rgb(80, 80, 80)",
        "rgb(116, 11, 7)",
        "rgb(194, 56, 0)",
        "rgb(232, 162, 0)",
        "rgb(0, 70, 25)",
        "rgb(0, 120, 93)",
        "rgb(0, 86, 158)",
        "rgb(14, 8, 101)",
        "rgb(85, 0, 105)",
        "rgb(135, 53, 84)",
        "rgb(204, 119, 77)",
        "rgb(99, 48, 13)"
    ]

class Point(BaseModel):
    x: float
    y: float

class Path(BaseModel):
    stroke_settings: StrokeSettings
    points: List[Point]

class DrawLineSegmentPayload(BaseModel):
    type: Literal["draw_line_segment"]
    path_start: bool
    stroke_settings: StrokeSettings
    endpoint1: Point
    endpoint2: Point

class UndoStrokePayload(BaseModel):
    type: Literal["undo_stroke"]

class ClearCanvasPayload(BaseModel):
    type: Literal["clear_canvas"]

class RoomStatePayload(BaseModel):
    type: Literal["room_state"]
    owner_name: str
    draw_time: int
    rounds: int
    is_game_ongoing: bool
    rounds_elapsed: Optional[int]
    hinted_target_word: Optional[str]
    subround_time_remaining: Optional[float]
    sketcher_name: Optional[str]
    players: List[PlayerPublic]
    chat_messages_history: List[str]
    path_drawing_history: Optional[List[Path]]

ServerOnlyPayload = Union[
    RoomStatePayload,
    JoinRoomNotificationPayload,
    LeaveRoomNotificationPayload,
    RoomOwnerChangedNotificationPayload,
    ServerStartGamePayload,
    NewRoundPayload,
    AssignedWordPayload,
    AssignedWordHintPayload,
    SubroundEndPayload
]

ClientOnlyPayload = Union[
    ClientStartGamePayload
]

ClientServerPayload = Union[
    PingPayload,
    PongPayload,
    DrawLineSegmentPayload, 
    UndoStrokePayload, 
    ClearCanvasPayload,
    ChatMessagePayload
]

class ClientWebSocketMessage(BaseModel):
    payload: Union[ClientOnlyPayload, ClientServerPayload] = Field(discriminator="type")