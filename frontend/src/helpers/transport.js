import { handleMouseDown, handleMouseMove, handleUndoStroke, handleClearCanvas } from "../helpers/canvas.js";

const chatColors = {
    default: "#000",
    joinRoomNotification: "#56CE27",
    leaveRoomNotification: "#CE4F0A",
    roomOwnerChangedNotification: "#ffa844",
    gameStart: "#56CE27",
    sketchStart: "#3975CE",
    closeGuess: "#ffb84d",
    wordReveal: "#7dad3f",
    correctGuess: "#56CE27",
    genAIJudgeComment: "#9D00FF"
};

function sendPingMessage(sendRef)
{
    if(sendRef.current == null)
        return;

    const sendFunc = sendRef.current;
    sendFunc({
        type: "ping"
    });
}

function sendPongMessage(sendRef)
{
    if(sendRef.current == null)
        return;

    const sendFunc = sendRef.current;
    sendFunc({
        type: "pong"
    });
}

function sendChatMessage(sendRef, content)
{
    if(sendRef.current == null)
        return;

    const sendFunc = sendRef.current;
    sendFunc({
        type: "chat_message",
        content: content
    });
}

function sendStartGameRequest(sendRef)
{
    if(sendRef.current == null)
        return;

    const sendFunc = sendRef.current;
    sendFunc({
        type: "start_game"
    });
}

function sendLineSegmentEndpoints(sendRef, pathStart, strokeSettings, endpoint1, endpoint2)
{
    if(sendRef.current == null)
        return;

    const sendFunc = sendRef.current;
    sendFunc({
        type: "draw_line_segment",
        path_start: pathStart,
        stroke_settings: strokeSettings,
        endpoint1: endpoint1,
        endpoint2: endpoint2
    });
}

function sendUndoStrokeMessage(sendRef)
{
    if(sendRef.current == null)
        return;

    const sendFunc = sendRef.current;
    sendFunc({
        type: "undo_stroke"
    });
}

function sendClearCanvasMessage(sendRef)
{
    if(sendRef.current == null)
        return;

    const sendFunc = sendRef.current;
    sendFunc({
        type: "clear_canvas"
    });
}

function processMessage(
    payload, 
    setIsReconnectingToServer,
    setGameState, 
    setChatMessages, 
    canvasRef, 
    pathDrawingHistoryRef, 
    isConnectionAliveRef, 
    sendRef
)
{
    isConnectionAliveRef.current = true;
    
    if(["ping", "pong"].includes(payload.type) === true)
    {
        if(payload.type === "ping")
            sendPongMessage(sendRef);

        return;
    }
    else if(payload.type === "room_state")
    {   
        if(payload.path_drawing_history != null)
        {
            pathDrawingHistoryRef.current = payload.path_drawing_history.map((path) => {
                return {
                    strokeSettings: path.stroke_settings,
                    points: path.points
                };
            });
        }
    
        const areFinalResultsObtained = payload.rounds_elapsed === payload.rounds ?
        true : false;

        const subroundEndTime = payload.subround_time_remaining != null ? 
        Math.ceil(Date.now() / 1000) + payload.subround_time_remaining : null;

        const players = payload.players.map((player) => {
            return {
                name: player.name,
                totalScore: player.total_score,
                roundwiseScore: player.roundwise_score,
                rank: player.rank,
                avatarIdx: player.avatar,
                isActive: player.is_active
            };
        });

        setIsReconnectingToServer(false);

        setGameState({
            ownerName: payload.owner_name,
            isGameOngoing: payload.is_game_ongoing,
            areFinalResultsObtained: areFinalResultsObtained,
            drawTime: payload.draw_time,
            rounds: payload.rounds,
            roundsElapsed: payload.rounds_elapsed,
            isNewRoundStarting: false,
            targetWord: null,
            hintedTargetWord: payload.hinted_target_word,
            revealedWord: null,
            sketcherName: payload.sketcher_name,
            subroundEndTime: subroundEndTime,
            subroundEndNote: null,
            genAIJudgeComment: null,
            players: players
        });
        
        const chatMessages = payload.chat_messages_history.map((message) => {
            let color = chatColors.default;
            if(message.includes(':') === false)
            {
                if(message.includes("has joined the room!") === true)
                    color = chatColors.joinRoomNotification;
                else if(message.includes("has left the room!") === true)
                    color = chatColors.leaveRoomNotification;
                else if(message.includes("is now the room owner!") === true)
                    color = chatColors.roomOwnerChangedNotification;
                else if(message.includes("is drawing now!") === true)
                    color = chatColors.sketchStart;
                else if(message.includes("The word was") === true)
                    color = chatColors.wordReveal;
                else if(message.includes("has correctly guessed the word!") === true)
                    color = chatColors.correctGuess;
                else if(message.includes("AI Judge says") === true)
                    color = chatColors.genAIJudgeComment;
            }

            return {
                color: color,
                content: message
            }
        });

        setChatMessages(chatMessages);
    }
    else if(["join_room_notification", "leave_room_notification"].includes(payload.type) === true)
    {
        setGameState((prevGameState) => {
            const players = payload.players.map((player) => {                
                let rank = player.rank;
                let totalScore = player.total_score;
                let roundwiseScore = player.roundwise_score;
                if(prevGameState.areFinalResultsObtained === true)
                {
                    const existingPlayer = prevGameState.players.find((p) => {
                        return p.name === player.name;
                    });

                    if(existingPlayer != null)
                    {
                        rank = existingPlayer.rank;
                        totalScore = existingPlayer.totalScore;
                        roundwiseScore = existingPlayer.roundwiseScore;
                    }
                }

                return {
                    name: player.name,
                    totalScore: totalScore,
                    roundwiseScore: roundwiseScore,
                    rank: rank,
                    avatarIdx: player.avatar,
                    isActive: player.is_active
                };
            });
                
            return {
                ...prevGameState,
                players: players
            };
        });

        setChatMessages((prevChatMessages) => {
            return [
                ...prevChatMessages, {
                    color: payload.type === "join_room_notification" ? 
                    chatColors.joinRoomNotification : chatColors.leaveRoomNotification,
                    content: `${payload.player_name} has ${payload.type === "join_room_notification" ? "joined" : "left"} the room!`
                }
            ];
        });
    }
    else if(payload.type === "room_owner_changed_notification")
    {
        setGameState((prevGameState) => {
            return {
                ...prevGameState,
                ownerName: payload.owner_name
            };
        });

        setChatMessages((prevChatMessages) => {
            return [
                ...prevChatMessages, {
                    color: chatColors.roomOwnerChangedNotification,
                    content: `${payload.owner_name} is now the room owner!`
                }
            ];
        });
    }
    else if(payload.type === "chat_message")
    {
        setChatMessages((prevChatMessages) => {
            let color = chatColors.default;
            if(payload.content.includes(':') === false)
            {
                if(payload.content.includes("has correctly guessed the word!") === true)
                    color = chatColors.correctGuess;
                else if(payload.content.includes("very close to the target word!") === true)
                    color = chatColors.closeGuess;
            }

            return [
                ...prevChatMessages, {
                    color: color,
                    content: payload.content
                }
            ];
        });
    }
    else if(payload.type === "draw_line_segment")
    {
        const endpoint1 = payload.endpoint1;
        const endpoint2 = payload.endpoint2;
        const strokeSettings = payload.stroke_settings;

        if(payload.path_start === true)
        {
            handleMouseDown(
                endpoint1.x,
                endpoint1.y,
                canvasRef,
                null,
                pathDrawingHistoryRef,
                strokeSettings,
                false
            );
        }
        
        handleMouseMove(
            endpoint2.x,
            endpoint2.y,
            canvasRef,
            pathDrawingHistoryRef,
            sendRef,
            false
        );
    }
    else if(payload.type === "undo_stroke")
    {
        handleUndoStroke(
            canvasRef, 
            pathDrawingHistoryRef,  
            sendRef,
            false
        );
    }
    else if(payload.type === "clear_canvas")
    {
        handleClearCanvas(
            canvasRef,
            pathDrawingHistoryRef,
            sendRef,
            false
        );
    }
    else if(payload.type === "start_game")
    {        
        const players = payload.players.map((player) => {
            return {
                name: player.name,
                totalScore: player.total_score,
                roundwiseScore: player.roundwise_score,
                rank: player.rank,
                avatarIdx: player.avatar,
                isActive: player.is_active
            };
        });

        setGameState((prevGameState) => {
            return {
                ...prevGameState,
                isGameOngoing: true,
                areFinalResultsObtained: false,
                isNewRoundStarting: true,
                players: players
            };
        });

        setChatMessages([{
            color: chatColors.gameStart,
            content: "A new game has started!"
        }]);
    }
    else if(payload.type === "new_round")
    {
        setGameState((prevGameState) => {
            return {
                ...prevGameState,
                isNewRoundStarting: true,
                roundsElapsed: payload.rounds_elapsed
            };
        });
    }
    else if(["assigned_word", "assigned_word_hint"].includes(payload.type) === true)
    {
        setGameState((prevGameState) => {
            const targetWord = payload.type === "assigned_word" ?
            payload.word.toUpperCase() : null;

            const hintedTargetWord = payload.type === "assigned_word_hint" ?
            payload.hinted_word.toUpperCase() : null;

            const subroundEndTime = Math.ceil(Date.now() / 1000) + prevGameState.drawTime;

            return {
                ...prevGameState,
                isNewRoundStarting: false,
                targetWord: targetWord,
                hintedTargetWord: hintedTargetWord,
                revealedWord: null,
                sketcherName: payload.sketcher_name,
                subroundEndTime: subroundEndTime,
                subroundEndNote: null,
                genAIJudgeComment: null
            };
        });

        setChatMessages((prevChatMessages) => {
            return [
                ...prevChatMessages, {
                    color: chatColors.sketchStart,
                    content: `${payload.sketcher_name} is drawing now!`
                }
            ];
        });
    }
    else if(payload.type === "subround_end")
    {
        handleClearCanvas(
            canvasRef,
            pathDrawingHistoryRef,
            sendRef,
            false
        );

        setGameState((prevGameState) => {
            const areFinalResultsObtained = payload.rounds_elapsed === prevGameState.rounds ?
            true : false;

            const players = payload.players.map((player) => {
                return {
                    name: player.name,
                    totalScore: player.total_score,
                    roundwiseScore: player.roundwise_score,
                    rank: player.rank,
                    avatarIdx: player.avatar,
                    isActive: player.is_active
                };
            });
            
            return {
                ...prevGameState,
                areFinalResultsObtained: areFinalResultsObtained,
                isNewRoundStarting: false,
                targetWord: null,
                hintedTargetWord: null,
                revealedWord: payload.word,
                sketcherName: null,
                subroundEndTime: null,
                subroundEndNote: payload.note,
                genAIJudgeComment: payload.genai_judge_comment,
                players: players
            };
        });

        const newChatMessages = [{
            color: chatColors.wordReveal,
            content: `The word was '${payload.word}'`
        }];

        if(payload.genai_judge_comment != null)
        {
            newChatMessages.push({
                color: chatColors.genAIJudgeComment,
                content: payload.genai_judge_comment
            });
        }

        setChatMessages((prevChatMessages) => {
            return [
                ...prevChatMessages, 
                ...newChatMessages
            ];
        });
    }
}

export { 
    sendPingMessage,
    sendChatMessage, 
    sendStartGameRequest, 
    sendLineSegmentEndpoints, 
    sendUndoStrokeMessage,
    sendClearCanvasMessage,
    processMessage 
};