import useWebSocket from "../hooks/useWebSocket.js";
import { useRef, useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

import { MoonLoader } from "react-spinners";

import Canvas from "../components/Canvas.jsx";
import GameBar from "../components/GameBar.jsx";
import ChatBox from "../components/ChatBox.jsx";
import GameLogo from "../components/GameLogo.jsx";
import PlayersList from "../components/PlayersList.jsx";
import RoomButtons from "../components/RoomButtons.jsx";
import GameToolbar from "../components/GameToolbar.jsx";
import FinalResultsDisplayBox from "../components/FinalResultsDisplayBox.jsx";
import SubroundResultsDisplayBox from "../components/SubroundResultsDisplayBox.jsx";

import { processMessage, sendPingMessage } from "../helpers/transport.js";

const chatColors = {
    default: "#000",
    gameOver: "#CE4F0A"
};

function Room()
{
    const { roomId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();    
    const playerName = searchParams.get("player_name");

    const timerRef = useRef(null);
    const [isReconnectingToServer, setIsReconnectingToServer] = useState(false);
    
    const [chatMessages, setChatMessages] = useState([]);
    const [gameState, setGameState] = useState({
        ownerName: null,
        isGameOngoing: false,
        areFinalResultsObtained: false,
        drawTime: null,
        rounds: null,
        roundsElapsed: null,
        isNewRoundStarting: false,
        targetWord: null,
        hintedTargetWord: null,
        revealedWord: null,
        sketcherName: null,
        subroundEndTime: null,
        subroundEndNote: null,
        genAIJudgeComment: null,
        players: []
    });

    const canvasRef = useRef(null);
    const pathDrawingHistoryRef = useRef([]);
    const [strokeSettings, setStrokeSettings] = useState({
        width: 2,
        color: "rgb(0, 0, 0)"
    });

    const sendRef = useRef(null);
    const handleIncomingMessage = useCallback((payload) => {
        processMessage(
            payload,
            setIsReconnectingToServer,
            setGameState,
            setChatMessages,
            canvasRef,
            pathDrawingHistoryRef,
            isConnectionAliveRef,
            sendRef
        );
    }, []);

    const navigate = useNavigate();
    const handleDisconnect = useCallback((code, reason, closeType) => {
        if(["normal", "transient"].includes(closeType) === true)
        {
            if(closeType === "transient")
            {
                if(timerRef.current != null)
                {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }

                setIsReconnectingToServer(true);
            }

            return;
        }
            
        navigate("/");
        if(reason != null)
            alert(reason);
    }, []);

    const isConnectionAliveRef = useRef(false);
    const { send, wsRef } = useWebSocket(
        `wss://${import.meta.env.VITE_BACKEND_HOST}/rooms/${roomId}?player_name=${playerName}`, {
            onClose: handleDisconnect,
            onMessage: handleIncomingMessage,
            reconnect: true
        }
    );

    useEffect(() => {
        sendRef.current = send;
        const heartbeat = setInterval(() => {
            if(isConnectionAliveRef.current === false)
            {
                if(wsRef.current != null)
                    wsRef.current.close(1000, "Transport close");

                return;
            }

            isConnectionAliveRef.current = false;
            sendPingMessage(sendRef);
        }, 60000);

        return () => {
            clearInterval(heartbeat);
        };
    }, []);

    useEffect(() => {
        if(isReconnectingToServer === true || gameState.areFinalResultsObtained === false)
            return;
        
        let timer = null;
        if(gameState.isGameOngoing === true)
        {
            setChatMessages((prevChatMessages) => {
                return [
                    ...prevChatMessages, {
                        color: chatColors.gameOver,
                        content: "Game over!"
                    }
                ];
            });

            timer = setTimeout(() => {
                timerRef.current = null;

                setGameState((prevGameState) => {
                    return {
                        ...prevGameState,
                        isGameOngoing: false,
                        roundsElapsed: null,
                        revealedWord: null,
                        subroundEndNote: null,
                        genAIJudgeComment: null
                    };
                });
            }, 3500);
        }
        else
        {
            timer = setTimeout(() => {
                timerRef.current = null;

                setGameState((prevGameState) => {
                    if(prevGameState.areFinalResultsObtained === false)
                        return prevGameState;

                    const players = prevGameState.players.map((player) => {
                        return {
                            ...player,
                            totalScore: 0,
                            roundwiseScore: [],
                            rank: 1,
                            roundsPlayed: 0
                        };
                    });

                    return {
                        ...prevGameState,
                        areFinalResultsObtained: false,
                        players: players
                    };
                });
            }, 6000);
        }

        timerRef.current = timer;

        return () => {
            if(timer != null)
                clearTimeout(timer);
        }; 
    }, [gameState.areFinalResultsObtained, gameState.isGameOngoing]);

    return (
        gameState.ownerName == null ?
        <div 
            className="w-[100vw] h-[100vh] flex items-center justify-center bg-[rgba(34,47,193,0.75)]"
        >
            <MoonLoader 
                size={75}
                speedMultiplier={0.8}
                color="white"
            >
            </MoonLoader>
        </div>
        :
        <div 
            className="w-[100vw] h-[100vh] flex flex-col items-center justify-center gap-3"
        >
            <GameLogo></GameLogo>
            
            <GameBar 
                isReconnectingToServer={isReconnectingToServer}
                gameState={gameState}
                setGameState={setGameState}
            >
            </GameBar>

            <div className="w-[98%] flex justify-between text-sm">
                <PlayersList
                    gameState={gameState}
                    playerName={playerName}
                >
                </PlayersList>
                
                {
                    isReconnectingToServer === true ?
                    (
                        <div 
                            className="bg-[#404040] text-white w-[62%] h-[500px] rounded-sm py-5 flex items-center justify-center text-xl font-semibold"
                        >
                            Lost connection to the server...Trying to reconnect
                        </div>
                    )
                    :
                    (
                        gameState.isGameOngoing === false ?
                        (
                            gameState.areFinalResultsObtained === true ?
                            <FinalResultsDisplayBox
                                gameState={gameState}
                                playerName={playerName}
                            >
                            </FinalResultsDisplayBox>
                            :
                            <div 
                                className="bg-[#404040] text-white w-[62%] h-[500px] rounded-sm py-5 flex items-center justify-center text-xl font-semibold"
                            >
                                Waiting for <span className="text-[#ffdfb4] whitespace-pre"> {playerName === gameState.ownerName ? "YOU" : gameState.ownerName} </span> to start the game...
                            </div>
                        )
                        :
                        (
                            gameState.subroundEndTime != null ?
                            (
                                <Canvas
                                    gameState={gameState}
                                    strokeSettings={strokeSettings}
                                    playerName={playerName}
                                    canvasRef={canvasRef}
                                    pathDrawingHistoryRef={pathDrawingHistoryRef}
                                    sendRef={sendRef}
                                >
                                </Canvas>
                            )
                            :
                            (
                                gameState.isNewRoundStarting === true ?
                                (   <div 
                                        className="bg-[#404040] w-[62%] h-[500px] rounded-sm flex items-center justify-center text-2xl text-white font-semibold"
                                    >
                                        Round {gameState.roundsElapsed + 1}
                                    </div>
                                )
                                :
                                (
                                    gameState.revealedWord != null ?
                                    <SubroundResultsDisplayBox
                                        gameState={gameState}
                                        playerName={playerName}
                                    >
                                    </SubroundResultsDisplayBox>
                                    :
                                    <div 
                                        className="bg-[#404040] w-[62%] h-[500px] rounded-sm flex items-center justify-center text-2xl text-white font-semibold"
                                    >
                                        Setting Up...
                                    </div>
                                )
                            )
                        )
                    )
                }

                <ChatBox
                    isReconnectingToServer={isReconnectingToServer}
                    chatMessages={chatMessages}
                    setChatMessages={setChatMessages}
                    playerName={playerName}
                    sendRef={sendRef}
                >
                </ChatBox>
            </div>
            
            {
                (isReconnectingToServer === false && (
                        (gameState.isGameOngoing === false && gameState.areFinalResultsObtained === false) || 
                        playerName === gameState.sketcherName
                    )
                ) ?
                (
                    gameState.isGameOngoing === false && gameState.areFinalResultsObtained === false ?
                    <RoomButtons
                        gameState={gameState}
                        setChatMessages={setChatMessages}
                        roomId={roomId}
                        playerName={playerName}
                        sendRef={sendRef}
                    >
                    </RoomButtons>
                    :
                    <GameToolbar
                        gameState={gameState}
                        strokeSettings={strokeSettings}
                        setStrokeSettings={setStrokeSettings}
                        playerName={playerName}
                        canvasRef={canvasRef}
                        pathDrawingHistoryRef={pathDrawingHistoryRef}
                        sendRef={sendRef}
                    >
                    </GameToolbar>
                )
                :
                (
                    <div className="invisible flex justify-between w-[60%] h-12">
                        <div className="w-[60%] text-lg font-semibold h-full">
                            Placeholder
                        </div>

                        <div className="w-[38%] text-lg font-semibold h-full">
                            Placeholder
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default Room;