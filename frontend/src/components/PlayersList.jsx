import OwnerCrown from "./OwnerCrown.jsx";
import PlayerAvatar from "./PlayerAvatar.jsx";

function PlayersList({ gameState, playerName })
{
    return (
        <div className="w-[18%]">
            {
                gameState.players.filter((player) => {
                    return player.isActive === true;
                }).map((player, idx, activePlayers) => {
                    return(
                        <div 
                            key={player.name} 
                            className={
                                `px-2 w-full h-[12.5%] flex items-center justify-between ${idx === 0 ? "rounded-t-sm" : ""} ${idx === activePlayers.length - 1 ? "rounded-b-sm" : ""} ${idx % 2 !== 0 ? "bg-gray-300" : "bg-white/95"}`
                            }
                        >
                            <div className="flex flex-col items-center">
                                <div className="text-md font-bold">
                                    #{player.rank}
                                </div>

                                <div className="text-sm font-semibold">
                                    {
                                        player.name === gameState.ownerName? 
                                        <OwnerCrown></OwnerCrown>
                                        : 
                                        <></>
                                    }
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-center">
                                <div className="text-md font-bold flex gap-0.5">
                                    <div>
                                        {player.name} 
                                    </div>
                                    
                                    <div>
                                        {
                                            playerName === player.name? 
                                            "(You)" : 
                                            ""
                                        }
                                    </div>
                                </div>

                                <div className="text-sm flex">
                                    {player.totalScore} points
                                </div>
                            </div>

                            <PlayerAvatar 
                                index={player.avatarIdx}
                            >
                            </PlayerAvatar>
                        </div>
                    );
                })
            }
        </div>
    );
}

export default PlayersList;