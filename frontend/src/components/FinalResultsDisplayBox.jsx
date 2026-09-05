import WinnerTrophy from "./WinnerTrophy.jsx";

function FinalResultsDisplayBox({ gameState, playerName })
{
    return (
        <div 
            className="bg-[#404040] w-[62%] h-[500px] rounded-sm py-10 flex flex-col gap-10 items-center"
        >
            <div 
                className="font-semibold text-3xl w-full flex justify-center text-[#ffdfb4]"
            >
                Final Results!
            </div>

            <div 
                className="w-full flex flex-col gap-3 items-center justify-center overflow-y-auto"
            >
                {
                    gameState.players.filter((player) => {
                        return player.roundwiseScore.flat().length > 0;
                    }).map((player, idx) => {
                        return (
                            <div 
                                key={player.name}
                                className={
                                    `${player.rank === 1 ? "text-yellow-500" : "text-gray-300"} font-semibold text-lg flex w-[55%] justify-between`
                                }
                            >
                                <div className="flex items-center justify-center w-[15%]">
                                    <div className="w-[50%] flex justify-center items-center">
                                        {
                                            player.rank === 1?
                                            <WinnerTrophy>
                                            </WinnerTrophy>
                                            :
                                            <></>
                                        }
                                    </div>

                                    <div className="w-[50%] flex justify-center items-center">
                                        #{player.rank}
                                    </div>
                                </div>

                                <div className="w-[55%] flex justify-start px-10 items-center">
                                    {player.name} {player.name === playerName ? "(You)" : ""}
                                </div>
                                
                                <div className="w-[30%] flex justify-end items-center">
                                    {player.totalScore} points
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        </div>
    );
}

export default FinalResultsDisplayBox;