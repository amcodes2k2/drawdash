import SubroundTimer from "./SubroundTimer.jsx";

function GameBar({ isReconnectingToServer, gameState, setGameState })
{
    return (
        <div 
            className="w-[98%] px-3 py-3 rounded-sm bg-white/95 flex justify-between text-md font-semibold"
        >
            <div 
                className="w-[33%] flex items-center justify-start"
            >
                {
                    (gameState.isGameOngoing === true && gameState.roundsElapsed != null && gameState.rounds != null) ?
                    (
                        `Round ${gameState.roundsElapsed + 1} of ${gameState.rounds}`
                    )
                    :
                    (
                        gameState.rounds != null ?
                        `Total Rounds: ${gameState.rounds}` 
                        :
                        ""
                    )
                }
            </div>

            <div 
                className="w-[33%] flex items-center justify-center"
            >
                {
                    gameState.hintedTargetWord != null || gameState.targetWord != null ?
                    (
                        <div className="flex gap-2">
                            <div className="font-light">
                                {
                                    gameState.hintedTargetWord != null ?
                                    `GUESS THIS (${gameState.hintedTargetWord.length}) :`
                                    :
                                    "DRAW THIS:"
                                }
                            </div>
                            
                            <div 
                                className={
                                    `flex gap-2 ${gameState.hintedTargetWord != null ? "font-bold" : ""}`
                                }
                            >
                                {
                                    gameState.hintedTargetWord != null ?
                                    (
                                        gameState.hintedTargetWord.split('').map((ch, idx) => {
                                                return (
                                                    <div key={idx}>
                                                        {ch}
                                                    </div>
                                                );
                                            }
                                        )
                                    )
                                    :
                                    (
                                        gameState.targetWord
                                    )
                                }
                            </div>
                        </div>
                    )
                    :
                    (
                        <div className="font-light">
                            WAITING
                        </div>
                    )
                }
            </div>

            <SubroundTimer
                isReconnectingToServer={isReconnectingToServer}
                gameState={gameState}
                setGameState={setGameState}
            >
            </SubroundTimer>
        </div>
    );
}

export default GameBar;