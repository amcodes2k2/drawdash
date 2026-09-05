function SubroundResultsDisplayBox({ gameState, playerName })
{
    return (
        <div 
            className="bg-[#404040] text-white w-[62%] h-[500px] rounded-sm py-5 flex flex-col gap-6 items-center justify-center font-semibold"
        >

            <div className="flex flex-col items-center justify-center gap-2">
                {
                    gameState.revealedWord != null ?
                    <div className="text-2xl">
                        The word was <span className="text-[#ffdfb4] whitespace-pre"> {gameState.revealedWord} </span>
                    </div>
                    :
                    <></>
                }
                
                {
                    gameState.subroundEndNote != null ?
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-lg">
                            {
                                gameState.subroundEndNote
                            }
                        </div>

                        {
                            gameState.genAIJudgeComment != null ?
                            <div>
                                (An AI judge was used to review the sketch)
                            </div>
                            :
                            <></>
                        }
                    </div>
                    :
                    <></>
                }
            </div>
    
            <div className="w-full flex flex-col gap-2 items-center justify-center overflow-y-auto">
                {
                    gameState.players.filter((player) => {
                        const roundwiseScoreFlattened = player.roundwiseScore.flat();
                        return roundwiseScoreFlattened.length > 0 && roundwiseScoreFlattened[roundwiseScoreFlattened.length - 1].score != null;
                    }).map((player) => {
                        const roundwiseScoreFlattened = player.roundwiseScore.flat();
                        const subroundScore = roundwiseScoreFlattened[roundwiseScoreFlattened.length - 1].score;

                        return (
                            <div 
                                key={player.name}
                                className="text-gray-300 font-semibold text-lg flex w-[50%] justify-between"
                            >
                                <div className="w-[50%] flex justify-start items-center">
                                    {player.name} {player.name === playerName ? "(You)" : ""}
                                </div>
                                
                                <div 
                                    className={
                                        `w-[50%] flex justify-end items-center ${subroundScore > 0 ? "text-green-500" : "text-red-500"}`
                                    }
                                >
                                    <span className={`${subroundScore > 0 ? "" : "invisible"}`}> + </span> {subroundScore}
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        </div>
    );
}

export default SubroundResultsDisplayBox;