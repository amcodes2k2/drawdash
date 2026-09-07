import random
import asyncio
from time import time
from uuid import UUID, uuid4
from typing import List, Dict, Set, Optional, Union

from config import Settings, get_settings
from fastapi.datastructures import Address as ClientAddress
from fastapi import WebSocket, WebSocketException, HTTPException

from data.word_pool import words
from utils.rate_limiter import RateLimiter
from utils.edit_distance_calculator import calculate_edit_distance
from utils.sketch_evaluator import SketchEvaluationError, SketchEvaluationResult, SketchEvaluator

from schemas import (
    CreateRoomRequestBody, CreateRoomResponseBody, 
    ClientOnlyPayload, ServerOnlyPayload, ClientServerPayload,
    PlayerPublic, PlayerSubroundScore, StrokeSettings, Point, Path, ClientWebSocketMessage,
    PingPayload, PongPayload, RoomOwnerChangedNotificationPayload, JoinRoomNotificationPayload, LeaveRoomNotificationPayload, ServerStartGamePayload, NewRoundPayload, RoomStatePayload, ChatMessagePayload, AssignedWordPayload, AssignedWordHintPayload, SubroundEndPayload
)

settings: Settings = get_settings()

chat_rate_limiter: RateLimiter = RateLimiter(
    limit=5,
    window_size_in_seconds=1.0
)

sketch_evaluator: SketchEvaluator = SketchEvaluator(
    model=settings.GEMINI_MODEL,
    api_key=settings.GEMINI_API_KEY,
    timeout=settings.GEMINI_RESPONSE_TIMEOUT
)

class SketcherDisconnectedException(Exception):
    pass

class Room:
    def __init__(self, configs: CreateRoomRequestBody) -> None:
        self.id: UUID = uuid4()
        self.created_at: float = time()
        self.owner_name: str = configs.owner_name
        self.rounds: int = configs.rounds
        self.capacity: int = configs.capacity
        self.draw_time: int = configs.draw_time
        self.max_no_of_letters_to_reveal: int = configs.max_no_of_letters_to_reveal
        
        self.heartbeat_task: Optional[asyncio.Task] = None
        self.connections: Dict[str, ClientAddress] = dict()
        self.active_connections: Dict[str, WebSocket] = dict()
        
        self.players_public: List[PlayerPublic] = list()
        self.available_avatars: List[int] = list(range(configs.capacity))

        self.total_points_drawn: Optional[int] = None
        self.path_drawing_history: Optional[List[Path]] = None
        
        self.chat_messages_history: List[str] = list()

        self.is_game_ongoing: bool = False
        self.rounds_elapsed: Optional[int] = None
        self.sketcher_name: Optional[str] = None
        self.target_word: Optional[str] = None
        self.hinted_target_word: Optional[str] = None
        self.subround_end_time: Optional[float] = None
        self.previously_assigned_words: Set[str] = set()
        self.subround_correct_guessers_names: Optional[Set[str]] = None
        self.game_loop_task: Optional[asyncio.Task] = None

    def get_properties(self) -> CreateRoomResponseBody:
        return CreateRoomResponseBody(
            id=self.id,
            owner_name=self.owner_name,
            capacity=self.capacity,
            draw_time=self.draw_time,
            rounds=self.rounds,
            max_no_of_letters_to_reveal=self.max_no_of_letters_to_reveal
        )

    def get_id(self) -> UUID:
        return self.id

    def get_creation_timestamp(self) -> float:
        return self.created_at

    def is_empty(self) -> bool:
        return len(self.active_connections) == 0
    
    def is_full(self) -> bool:
        return len(self.active_connections) == self.capacity
    
    def is_game_connection_limit_exceeded(self) -> bool:
        return len(self.connections) > 3 * self.capacity
    
    async def unicast(
        self, 
        receiver_name: str, 
        payload: Union[ServerOnlyPayload, ClientServerPayload]
    ) -> None:
        if receiver_name not in self.active_connections:
            return
        
        receiver_websocket: WebSocket = self.active_connections[receiver_name]

        try:
            await receiver_websocket.send_json(payload.model_dump())
        except Exception:
            await self.disconnect(player_name=receiver_name)

    async def broadcast(
        self, 
        sender_name: str, 
        payload: Union[ServerOnlyPayload, ClientServerPayload]
    ) -> None:
        disconnected_players_names: List[str] = list()
        connections_snapshot: Dict[str, WebSocket] = self.active_connections.copy()

        for player_name in connections_snapshot:
            if player_name not in self.active_connections:
                disconnected_players_names.append(player_name)
                continue
            
            if player_name == sender_name:
                continue

            receiver_websocket: WebSocket = connections_snapshot[player_name]

            try:
                await receiver_websocket.send_json(payload.model_dump())
            except Exception:
                disconnected_players_names.append(player_name)

        for player_name in disconnected_players_names:
            await self.disconnect(player_name=player_name)

    def cancel_heartbeat_task(self) -> None:
        if self.heartbeat_task != None and self.heartbeat_task.done() == False:
            self.heartbeat_task.cancel()

        self.heartbeat_task = None
    
    async def heartbeat(self) -> None:
        try:
            while True:
                await self.broadcast(
                    sender_name="__server__",
                    payload=PingPayload(
                        type="ping"
                    )
                )

                await asyncio.sleep(30.0)
        except asyncio.CancelledError:
            pass

    async def choose_new_owner(self) -> None:
        if self.is_empty() == True:
            return
        
        self.owner_name = random.choice(list(self.active_connections.keys()))
        self.chat_messages_history.append(f"{self.owner_name} is now the room owner!")
        
        await self.broadcast(
            sender_name="__server__",
            payload=RoomOwnerChangedNotificationPayload(
                type="room_owner_changed_notification",
                owner_name=self.owner_name
            )
        )

    async def disconnect(self, player_name: str) -> None:
        if player_name not in self.active_connections:
            return

        self.active_connections.pop(player_name, None)
        if self.is_game_ongoing == False:
            self.connections.pop(player_name, None)

        idx: int = 0
        while idx < len(self.players_public):
            player: PlayerPublic = self.players_public[idx]
            if player.name == player_name:
                if self.is_game_ongoing == True:
                    player.is_active = False
                else:
                    self.players_public.pop(idx)
                    self.available_avatars.append(player.avatar)

                break

            idx += 1
        
        if self.is_game_ongoing == True and len(self.active_connections) < 2:
            self.cancel_game_loop_task()

        self.chat_messages_history.append(f"{player_name} has left the room!")
        await self.broadcast(
            sender_name=player_name,
            payload=LeaveRoomNotificationPayload(
                type="leave_room_notification",
                player_name=player_name,
                players=self.players_public
            )
        )

        if self.owner_name not in self.active_connections:
            await self.choose_new_owner()

    def rank_players(self) -> None:
        if len(self.players_public) == 0:
            return

        self.players_public.sort(
            key=lambda player: player.total_score, reverse=True
        )

        self.players_public[0].rank = 1
        for i in range(1, len(self.players_public)):
            if self.players_public[i].total_score == self.players_public[i - 1].total_score:
                self.players_public[i].rank = self.players_public[i - 1].rank
            else:  
                self.players_public[i].rank = self.players_public[i - 1].rank + 1

    async def connect(self, player_name: str, websocket: WebSocket) -> None:   
        if player_name == "__server__":
            raise WebSocketException(
                code=4003,
                reason="Provided player name is reserved"
            )

        if self.is_full() == True:
            raise WebSocketException(
                code=4009,
                reason="Room is full"
            )
        
        if self.is_game_connection_limit_exceeded() == True:
            raise WebSocketException(
                code=4009,
                reason="Game connection limit is exceeded due to high player turnover"
            )
        
        did_player_rejoin: bool = False
        if player_name in self.connections:
            client_current_address: ClientAddress = websocket.client
            client_previous_address: ClientAddress = self.connections[player_name]
            if client_current_address.host != client_previous_address.host:
                raise WebSocketException(
                    code=4009,
                    reason="Player with same name already exists"
                )
            
            did_player_rejoin = True
        
        self.active_connections[player_name] = websocket
        self.connections[player_name] = ClientAddress(
            host=websocket.client.host, 
            port=websocket.client.port
        )

        if self.heartbeat_task == None:
            self.heartbeat_task = asyncio.create_task(self.heartbeat())

        if did_player_rejoin == False:
            avatar: int = self.available_avatars[0]
            self.available_avatars.remove(avatar)

            self.players_public.append(
                PlayerPublic(
                    name=player_name,
                    rank=-1,
                    avatar=avatar,
                    is_active=True,
                    total_score=0,
                    roundwise_score=[list() for _ in range(self.rounds)]
                )
            )
        else:
            for player in self.players_public:
                if player.name == player_name:
                    player.is_active = True
                    break

        self.rank_players()
        self.chat_messages_history.append(f"{player_name} has joined the room!")
        await self.broadcast(
            sender_name=player_name,
            payload=JoinRoomNotificationPayload(
                type="join_room_notification",
                player_name=player_name,
                players=self.players_public
            )
        )

        subround_time_remaining: Optional[float] = None 
        if self.subround_end_time != None:
            subround_time_remaining = max(0, int(self.subround_end_time - time()))

        await self.unicast(
            receiver_name=player_name,
            payload=RoomStatePayload(
                type="room_state",
                owner_name=self.owner_name,
                draw_time=self.draw_time,
                rounds=self.rounds,
                is_game_ongoing=self.is_game_ongoing,
                rounds_elapsed=self.rounds_elapsed,
                hinted_target_word=self.hinted_target_word,
                subround_time_remaining=subround_time_remaining,
                sketcher_name=self.sketcher_name,
                players=self.players_public,
                chat_messages_history=self.chat_messages_history,
                path_drawing_history=self.path_drawing_history
            )
        )

    async def broadcast_subround_score(self, note: Optional[str] = None) -> None:
        sketcher_name_: Optional[str] = self.sketcher_name
        target_word_: Optional[str] = self.target_word

        if target_word_ != None:
            self.target_word = None
            self.hinted_target_word = None
            self.chat_messages_history.append(f"The word was '{target_word_}'")
        
        path_drawing_history_: Optional[List[Path]] = None
        if self.path_drawing_history != None:
            path_drawing_history_ = self.path_drawing_history.copy()
            self.total_points_drawn = None
            self.path_drawing_history = None
        
        subround_correct_guessers_count: Optional[int] = None
        if self.subround_correct_guessers_names != None:
            subround_correct_guessers_count = len(self.subround_correct_guessers_names)
            self.subround_correct_guessers_names = None
    
        self.sketcher_name = None
        self.subround_end_time = None

        genai_judge_comment: Optional[str] = None
        if subround_correct_guessers_count != None and subround_correct_guessers_count == 0 and path_drawing_history_ != None and len(path_drawing_history_) > 0:
            sketch_evaluation_result: Optional[SketchEvaluationResult] = None

            try:
                sketch_evaluation_result = await sketch_evaluator.evaluate_sketch(
                    path_drawing_history=path_drawing_history_,
                    target_word=target_word_
                )
            except SketchEvaluationError as e:
                pass

            if sketch_evaluation_result != None and sketch_evaluation_result.score > 5:
                for player in self.players_public:
                    if player.name == sketcher_name_:
                        player.total_score += sketch_evaluation_result.score - 5
                        for round in reversed(range(self.rounds)):
                            if len(player.roundwise_score[round]) > 0:
                                player.roundwise_score[round][-1].score = sketch_evaluation_result.score - 5
                                break
                        
                        break
                
                genai_judge_comment = f"AI Judge says '{sketch_evaluation_result.comment}'"
                self.chat_messages_history.append(genai_judge_comment)
        
        self.rank_players()
        await self.broadcast(
            sender_name="__server__",
            payload=SubroundEndPayload(
                type="subround_end",
                word=target_word_,
                sketcher_name=sketcher_name_,
                note=note,
                genai_judge_comment=genai_judge_comment,
                rounds_elapsed=self.rounds_elapsed,
                players=self.players_public
            )
        )

        await asyncio.sleep(4.0)

    def cancel_game_loop_task(self) -> None:
        if self.game_loop_task != None and self.game_loop_task.done() == False:
            self.game_loop_task.cancel()

        self.game_loop_task = None

    async def game_loop(self) -> None:
        try:
            self.rounds_elapsed = 0

            for round_no in range(self.rounds):
                await self.broadcast(
                    sender_name="__server__",
                    payload=NewRoundPayload(
                        type="new_round",
                        rounds_elapsed=self.rounds_elapsed
                    )
                )
                await asyncio.sleep(2.0)

                connections_snapshot: Dict[str, WebSocket] = self.active_connections.copy()
                for idx, player_name in enumerate(connections_snapshot):
                    if len(self.previously_assigned_words) == len(words):
                        self.previously_assigned_words.clear()

                    self.total_points_drawn = 0
                    self.path_drawing_history = list()

                    self.sketcher_name = player_name
                    self.chat_messages_history.append(f"{self.sketcher_name} is drawing now!")
                    self.target_word = random.choice(list(words - self.previously_assigned_words))
                    self.previously_assigned_words.add(self.target_word)

                    subround_guessers_count: int = 0
                    self.subround_correct_guessers_names = set()
                    for player in self.players_public:    
                        if player.name in connections_snapshot and player.name != self.sketcher_name:
                            subround_guessers_count += 1

                        player.roundwise_score[round_no].append(
                            PlayerSubroundScore(
                                role="sketcher" if player.name == self.sketcher_name else "guesser",
                                sketcher_name=self.sketcher_name,
                                score=0 if player.name in connections_snapshot else None
                            )
                        )

                    self.hinted_target_word = '_' * len(self.target_word)
                    if self.max_no_of_letters_to_reveal > 0:
                        no_of_letters_to_reveal: int = min(
                            int(len(self.target_word) / 2),
                            self.max_no_of_letters_to_reveal
                        )

                        indices_to_reveal: List[int] = random.sample(
                            population=range(len(self.target_word)),
                            k=no_of_letters_to_reveal
                        )

                        self.hinted_target_word = ""
                        for idx_ in range(len(self.target_word)):
                            self.hinted_target_word += '_' if idx_ not in indices_to_reveal else self.target_word[idx_]

                    try:
                        note: Optional[str] = None

                        await self.unicast(
                            receiver_name=player_name,
                            payload=AssignedWordPayload(
                                type="assigned_word",
                                rounds_elapsed=self.rounds_elapsed,
                                word=self.target_word,
                                sketcher_name=self.sketcher_name
                            )
                        )

                        if self.sketcher_name not in self.active_connections:
                            raise SketcherDisconnectedException

                        await self.broadcast(
                            sender_name=player_name, 
                            payload=AssignedWordHintPayload(
                                type="assigned_word_hint",
                                rounds_elapsed=self.rounds_elapsed,
                                hinted_word=self.hinted_target_word,
                                sketcher_name=self.sketcher_name
                            )
                        )

                        if self.sketcher_name not in self.active_connections:
                            raise SketcherDisconnectedException
                    
                        self.subround_end_time = time() + self.draw_time + 2.0
                        while time() < self.subround_end_time:
                            await asyncio.sleep(1.0)

                            if self.sketcher_name not in self.active_connections:
                                raise SketcherDisconnectedException

                            subround_active_guessers_names: Set[str] = set()
                            active_players_names: List[str] = list(self.active_connections.keys())
                            for player_name_ in active_players_names:
                                if player_name_ in connections_snapshot and player_name_ != self.sketcher_name:
                                    subround_active_guessers_names.add(player_name_)

                            if subround_active_guessers_names.issubset(self.subround_correct_guessers_names):
                                break
                    except SketcherDisconnectedException:
                        note = "The sketcher has left the room!"
                    finally:
                        if self.game_loop_task != None:
                            if idx == len(connections_snapshot) - 1:
                                self.rounds_elapsed = round_no + 1

                            if note == None:
                                if len(self.subround_correct_guessers_names) == 0:
                                    note = "No one has guessed the word correctly!"
                                elif len(self.subround_correct_guessers_names) == subround_guessers_count:
                                    note = "Everyone has guessed the word correctly!"

                            await self.broadcast_subround_score(note=note)
        except asyncio.CancelledError:
            note: Optional[str] = None
            self.rounds_elapsed = self.rounds
            if len(self.active_connections) < 2:
                note = "Not enough players to continue the game!"
            
            await self.broadcast_subround_score(note=note)
        finally:
            self.is_game_ongoing = False
            self.rounds_elapsed = None
            self.previously_assigned_words.clear()
            self.game_loop_task = None
            
            for player in self.players_public:
                player.rank = 1
                player.total_score = 0
                for round_no in range(self.rounds):
                    player.roundwise_score[round_no].clear()

    async def process_message(
        self, 
        sender_name: str, 
        payload: Union[ClientOnlyPayload, ClientServerPayload]
    ) -> None:
        if sender_name not in self.connections:
            raise WebSocketException(
                code=4003,
                reason="You are not connected to this room"
            )
        
        if payload.type in ("draw_line_segment", "undo_stroke", "clear_canvas"):
            if self.is_game_ongoing == False or sender_name != self.sketcher_name:
                return
            
            if payload.type in ("undo_stroke", "clear_canvas") and len(self.path_drawing_history) == 0:
                return

        if payload.type == "draw_line_segment":
            if payload.path_start == False and len(self.path_drawing_history) == 0:
                return 
            
            if self.total_points_drawn > 20000:
                return

            endpoint1: Point = payload.endpoint1
            endpoint2: Point = payload.endpoint2
            stroke_settings: StrokeSettings = payload.stroke_settings

            if payload.path_start == True:
                self.total_points_drawn += 2
                self.path_drawing_history.append(
                    Path(
                        stroke_settings=stroke_settings,
                        points=[endpoint1, endpoint2]
                    )
                )
            else:                
                self.total_points_drawn += 1
                self.path_drawing_history[-1].points.append(endpoint2)
        elif payload.type == "undo_stroke":                        
            self.total_points_drawn -= len(self.path_drawing_history[-1].points)
            self.path_drawing_history.pop()
        elif payload.type == "clear_canvas":
            self.total_points_drawn = 0
            self.path_drawing_history.clear()
        elif payload.type == "start_game":
            if self.is_game_ongoing == True or sender_name != self.owner_name:
                return
        
            if len(self.active_connections) < 2:
                return
            
            self.is_game_ongoing = True
            self.chat_messages_history.clear()     

            sender_name = "__server__"
            payload = ServerStartGamePayload(
                type="start_game",
                players=self.players_public
            )
        elif payload.type == "chat_message":
            message_timestamp: float = time()
        
            if chat_rate_limiter.is_rate_limit_exceeded(key=f"{self.id}:{sender_name}") == True:
                await self.disconnect(player_name=sender_name)
                raise WebSocketException(
                    code=1008,
                    reason="Chat spam detected"
                )
                
            payload.content = payload.content.strip()
            if len(payload.content) < 1 or len(payload.content) > 100:
                return

            if self.subround_end_time != None and message_timestamp < self.subround_end_time:
                guessed_word: str = payload.content
                guessed_word_len: int = len(payload.content)
                target_word_len: int = len(self.target_word)

                word_len_diff: int = abs(guessed_word_len - target_word_len)
                if (target_word_len <= 5 and word_len_diff <= 1) or (target_word_len > 5 and word_len_diff <= 2):
                    edit_distance: int = calculate_edit_distance(
                        word1=guessed_word.lower(), 
                        word2=self.target_word.lower(),
                        n1=guessed_word_len,
                        n2=target_word_len,
                        cache=[
                            [-1 for _ in range(target_word_len + 1)] for _ in range(guessed_word_len + 1)
                        ]
                    )

                    if (target_word_len <= 5 and edit_distance <= 1) or (target_word_len > 5 and edit_distance <= 2):
                        if sender_name == self.sketcher_name:
                            return
                    
                        sender: PlayerPublic = None
                        sketcher: PlayerPublic = None
                        for player in self.players_public:
                            if player.name == self.sketcher_name:
                                sketcher = player
                            
                            if player.name == sender_name:
                                sender = player

                        if len(sender.roundwise_score[self.rounds_elapsed]) == 0 or sender_name in self.subround_correct_guessers_names:
                            return

                        if edit_distance == 0:
                            sketcher.roundwise_score[self.rounds_elapsed][-1].score += 5
                            sender.roundwise_score[self.rounds_elapsed][-1].score = max(
                                1, int(self.subround_end_time - message_timestamp)
                            ) * 2

                            sketcher.total_score += 5
                            sender.total_score += sender.roundwise_score[self.rounds_elapsed][-1].score
                            
                            self.subround_correct_guessers_names.add(sender_name)
                            payload.content = f"{sender_name} has correctly guessed the word!"
                            sender_name = "__server__"
                        else:
                            await self.unicast(
                                receiver_name=sender_name,
                                payload=ChatMessagePayload(
                                    type="chat_message",
                                    content=f"{guessed_word} is very close to the target word!"
                                )
                            )

                            return
            
            if sender_name != "__server__":
                payload.content = f"{sender_name}: {payload.content}"

            self.chat_messages_history.append(payload.content)
        else:
            if payload.type == "ping":
                await self.unicast(
                    receiver_name=sender_name,
                    payload=PongPayload(
                        type="pong"
                    )
                )

            return

        await self.broadcast(sender_name=sender_name, payload=payload)

        if payload.type == "start_game":
            self.game_loop_task = asyncio.create_task(self.game_loop())

    async def close_all_connections(self) -> None:
        active_connections_snapshot: Dict[str, WebSocket] = self.active_connections.copy()
        for player_name in active_connections_snapshot:
            self.active_connections.pop(player_name, None)
            player_websocket: WebSocket = active_connections_snapshot[player_name]

            try:
                await player_websocket.close(
                    code=1001,
                    reason="Server is shutting down"
                )
            except Exception:
                pass

class RoomManager:
    def __init__(self) -> None:
        self.rooms: Dict[UUID, Room] = dict()
        self.is_server_shutting_down: bool = False
        self.cleanup_empty_rooms_task: Optional[asyncio.Task] = None

    async def cleanup_empty_rooms_loop(self) -> None:
        try:
            while True:
                rooms_snapshot: Dict[UUID, Room] = self.rooms.copy()
                for room_id in rooms_snapshot:
                    room: Room = rooms_snapshot[room_id]
                    if room.is_empty() == True and time() - room.get_creation_timestamp() > 60.0:
                        room.cancel_heartbeat_task()
                        self.rooms.pop(room_id, None)

                await asyncio.sleep(60.0)
        except asyncio.CancelledError:
            pass

    def read_room_properties(self, room_id) -> CreateRoomResponseBody:
        if room_id not in self.rooms:
            raise HTTPException(
                status_code=404,
                detail="Room doesn't exist"
            )
        
        room: Room = self.rooms[room_id]
        return room.get_properties()

    async def create_room(self, configs: CreateRoomRequestBody) -> UUID:
        if self.is_server_shutting_down == True:
            raise HTTPException(
                status_code=503, 
                detail="Server is shutting down"
            )

        room: Room = Room(configs=configs)

        room_id: UUID = room.get_id()
        self.rooms[room_id] = room

        if self.cleanup_empty_rooms_task == None:
            self.cleanup_empty_rooms_task = asyncio.create_task(self.cleanup_empty_rooms_loop())

        return room_id

    async def add_to_room(self, room_id: UUID, player_name: str, websocket: WebSocket) -> None:
        if self.is_server_shutting_down == True:
            raise WebSocketException(
                code=1001,
                reason="Server is shutting down"
            )

        if room_id not in self.rooms:
            raise WebSocketException(
                code=4004,
                reason="Room doesn't exist"
            )
        
        room: Room = self.rooms[room_id]
        await room.connect(player_name=player_name, websocket=websocket)

    async def remove_from_room(self, room_id: UUID, player_name: str) -> None:
        if self.is_server_shutting_down == True or room_id not in self.rooms:
            return
        
        room: Room = self.rooms[room_id]
        await room.disconnect(player_name=player_name)

    async def send_message_to_room(
        self,  
        room_id: UUID,
        sender_name: str,
        message: ClientWebSocketMessage
    ) -> None:
        if self.is_server_shutting_down == True:
            return
        
        if room_id not in self.rooms:
            raise WebSocketException(
                code=4004,
                reason="Room doesn't exist"
            )
        
        room: Room = self.rooms[room_id]
        await room.process_message(sender_name=sender_name, payload=message.payload)

    async def graceful_shutdown(self) -> None:
        self.is_server_shutting_down = True
        if self.cleanup_empty_rooms_task != None and self.cleanup_empty_rooms_task.done() == False:
            self.cleanup_empty_rooms_task.cancel()

        rooms_snapshot: Dict[UUID, Room] = self.rooms.copy()
        for room_id in rooms_snapshot:
            room: Room = rooms_snapshot[room_id]

            room.cancel_game_loop_task()
            room.cancel_heartbeat_task()
            await room.close_all_connections()

        await sketch_evaluator.release_resources()
        chat_rate_limiter.cancel_expired_timestamps_cleanup_task()