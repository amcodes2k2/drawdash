import PlayerAvatar from "./PlayerAvatar.jsx";

function GameLogo()
{
    return (
        <div className="flex flex-col items-center">
            <div 
                className="text-white font-semibold text-4xl md:text-5xl 2xl:text-6xl"
            >
                DrawDash
            </div>

            <div className="flex">
                {
                    [0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                        return (
                            <PlayerAvatar 
                                key={idx} 
                                index={idx}
                            >
                            </PlayerAvatar>
                        );
                    })
                }
            </div>
        </div>
    );
}

export default GameLogo;