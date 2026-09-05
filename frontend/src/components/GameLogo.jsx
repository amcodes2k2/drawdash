import PlayerAvatar from "./PlayerAvatar.jsx";

function GameLogo({ tailwindClasses, avatarSize })
{
    return (
        <div className={tailwindClasses}>
            <div 
                className="text-white font-semibold text-4xl"
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
                                size={avatarSize}
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