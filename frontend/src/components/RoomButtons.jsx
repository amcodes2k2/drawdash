import { sendStartGameRequest } from "../helpers/transport";

const chatColors = {
    default: "#000"
};

function RoomButtons({ gameState, setChatMessages, roomId, playerName, sendRef })
{
    return (
        <div 
            className="flex justify-between w-[60%] h-12"
        >
            <button 
                onClick={(event) => {
                    if(playerName !== gameState.ownerName)
                        return;

                    const activePlayers = gameState.players.filter((player) => {
                        return player.isActive === true;
                    });

                    if(activePlayers.length < 2)
                    {
                        alert("Need at least 2 active players to start the game!");
                        return;
                    }

                    sendStartGameRequest(sendRef);
                }}
                disabled={
                    playerName !== gameState.ownerName
                }
                className={
                    `${playerName === gameState.ownerName ? "bg-green-500 text-white cursor-pointer" : "bg-green-700 text-white cursor-not-allowed"} text-lg font-semibold w-[60%] rounded h-full`
                }
            >
                Start game!
            </button>

            <button 
                onClick={(event) => {
                    navigator.clipboard.writeText(roomId);
                
                    setChatMessages((prevChatMessages) => {
                        return [
                            ...prevChatMessages, {
                                color: chatColors.default,
                                content: "Copied room id to clipboard"
                            }
                        ]
                    });
                }}
                className="bg-blue-500 text-white text-lg font-semibold w-[38%] cursor-pointer rounded h-full"
            >
                Copy Room ID
            </button>
        </div>
    );
}

export default RoomButtons;