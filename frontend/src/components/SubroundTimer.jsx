import { useRef, useState, useEffect } from "react";

function SubroundTimer({ isReconnectingToServer, gameState, setGameState })
{
    const timerRef = useRef(null);
    const [subroundTimeLeft, setSubroundTimeLeft] = useState(null);

    useEffect(() => {
        if(isReconnectingToServer === true || gameState.subroundEndTime == null)
        {
            if(gameState.subroundEndTime == null)
            {
                if(timerRef.current != null)
                {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }

                setSubroundTimeLeft(null);
            }
                
            return;
        }

        const timer = setTimeout(() => {
            timerRef.current = null;
            
            const subroundTimeLeft = Math.ceil(gameState.subroundEndTime - Date.now() / 1000);
            if(subroundTimeLeft > 0)
            {
                setSubroundTimeLeft(subroundTimeLeft);
                return;
            }

            setSubroundTimeLeft(0);
            setGameState((prevGameState) => {
                return {
                    ...prevGameState,
                    sketcherName: null
                };
            });
        }, 1000);

        timerRef.current = timer;

        return () => {
            clearTimeout(timer);
        };
    }, [subroundTimeLeft, gameState.subroundEndTime]);

    useEffect(() => {
        if(isReconnectingToServer === true && timerRef.current != null)
        {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, [isReconnectingToServer]);

    return (
        <div className="w-[33%] flex items-center justify-end">
            {
                subroundTimeLeft != null ?
                (   
                    `Time Left: ${subroundTimeLeft}s`
                )
                :
                (
                    gameState.isGameOngoing === false && gameState.drawTime != null ?
                    `Drawtime: ${gameState.drawTime}s`
                    :
                    ""
                )
            }
        </div>
    );
}

export default SubroundTimer;