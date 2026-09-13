import { useState } from "react";
import { useNavigate } from "react-router-dom";

import GameLogo from "../components/GameLogo.jsx";

function Home()
{
    const navigate = useNavigate();
    const [isRunning, setIsRunning] = useState(false);

    const [createNewRoomFormData, setCreateNewRoomFormData] = useState({
        ownerName: "",
        capacity: 2,
        drawTime: 15,
        rounds: 2,
        maxNoOfLettersToReveal: 0
    });

    const [joinExistingRoomFormData, setJoinExistingRoomFormData] = useState({
        playerName: "",
        roomId: ""
    });

    async function handleSubmit(event)
    {
        try
        {
            event.preventDefault();
            
            setIsRunning(true);
            if(event.target.id === "createNewRoomForm")
            {
                const response = await fetch(`https://${import.meta.env.VITE_BACKEND_HOST}/rooms`, {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        owner_name: createNewRoomFormData.ownerName,
                        capacity: createNewRoomFormData.capacity,
                        draw_time: createNewRoomFormData.drawTime,
                        rounds: createNewRoomFormData.rounds,
                        max_no_of_letters_to_reveal: createNewRoomFormData.maxNoOfLettersToReveal
                    })
                });
                
                if(response.status === 201)
                {
                    const data = await response.json();
                    
                    const roomId = data.id;
                    const playerName = data.owner_name;
                    navigate(`/rooms/${roomId}?player_name=${playerName}`);
                }
                else if(response.status === 429)
                {
                    console.log(response);
                    alert("Too many requests");
                }
                else if(response.status === 503)
                {
                    console.log(response);
                    alert("Service is unavailable...try again later");
                }
                else
                {
                    console.log(response);
                    alert("Something went wrong...try again later");
                }
            }
            else
            {
                const roomId = joinExistingRoomFormData.roomId;
                const playerName = joinExistingRoomFormData.playerName;

                navigate(`/rooms/${roomId}?player_name=${playerName}`);
            }
        }
        catch(error)
        {
            console.log(error);
            alert("Something went wrong...try again later");
        }
        finally
        {
            setIsRunning(false);
            if(event.target.id === "createNewRoomForm")
            {
                setCreateNewRoomFormData({
                    ownerName: "",
                    capacity: 2,
                    drawTime: 15,
                    rounds: 2,
                    maxNoOfLettersToReveal: 0
                });
            }
            else
            {
                setJoinExistingRoomFormData({
                    playerName: "",
                    roomId: ""
                });
            }
        }
    }

    function handleChange(event)
    {
        if(["ownerName", "capacity", "drawTime", "rounds", "maxNoOfLettersToReveal"].includes(event.target.id) === true)
        {
            setCreateNewRoomFormData((prevFormData) => {
                return {
                    ...prevFormData,
                    [event.target.id]: event.target.id === "ownerName" ? 
                    event.target.value : parseInt(event.target.value)
                };
            });
        }
        else
        {
            setJoinExistingRoomFormData((prevFormData) => {
                return {
                    ...prevFormData,
                    [event.target.id]: event.target.value
                };
            });
        }
    }

    return (
        <div className="w-[100vw] h-[100dvh] flex flex-col items-center justify-center gap-6">
            <GameLogo>  
            </GameLogo>

            <div 
                className="w-[90vw] max-w-[350px] md:max-w-[550px] lg:max-w-[600px] bg-white/95 rounded-sm text-[12.5px] md:text-base md:rounded-md p-2.75 md:p-5 flex flex-col md:gap-8"
            >
                <form id="createNewRoomForm" onSubmit={handleSubmit}>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-full flex justify-between items-center">
                            <label 
                                htmlFor="ownerName"
                                className="font-bold lg:font-semibold"
                            >
                                Name:
                            </label>
                            <input
                                id="ownerName"
                                required
                                minLength={3}
                                maxLength={8}
                                pattern="[a-zA-Z0-9_]+"
                                onChange={handleChange}
                                title="Name can contain only letters, numbers, and underscores"
                                value={createNewRoomFormData.ownerName}
                                placeholder="Enter your name"
                                className="border rounded-xs md:rounded w-[75%] md:w-[80%] px-2 py-1"
                            >
                            </input>
                        </div>
                    
                        <div className="w-full flex justify-between items-center">
                            <label 
                                htmlFor="capacity"
                                className="font-bold lg:font-semibold"
                            >
                                Players:
                            </label>
                            <select 
                                id="capacity" 
                                required
                                onChange={handleChange}
                                value={createNewRoomFormData.capacity}
                                className="border rounded-xs md:rounded w-[75%] md:w-[80%] px-2 py-1"
                            >
                                {
                                    [2, 3, 4, 5, 6, 7, 8].map((capacity) => {
                                        return (
                                            <option 
                                                key={capacity} 
                                                value={capacity}
                                            >
                                                {capacity}
                                            </option>
                                        );
                                    })
                                }
                            </select>
                        </div>

                        <div className="w-full flex justify-between items-center">
                            <label 
                                htmlFor="drawTime"
                                className="font-bold lg:font-semibold"
                            >
                                Drawtime:
                            </label>
                            <select 
                                id="drawTime" 
                                required
                                onChange={handleChange}
                                value={createNewRoomFormData.drawTime}
                                className="border rounded-xs md:rounded w-[75%] md:w-[80%] px-2 py-1"
                            >
                                {
                                    [15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120].map((drawtime) => {
                                        return (
                                            <option 
                                                key={drawtime} 
                                                value={drawtime}
                                            >
                                                {drawtime}
                                            </option>
                                        );
                                    })
                                }
                            </select>
                        </div>

                        <div className="w-full flex justify-between items-center">
                            <label 
                                htmlFor="rounds"
                                className="font-bold lg:font-semibold"
                            >
                                Rounds:
                            </label>
                            <select 
                                id="rounds" 
                                required
                                onChange={handleChange}
                                value={createNewRoomFormData.rounds}
                                className="border rounded-xs md:rounded w-[75%] md:w-[80%] px-2 py-1"
                            >
                                {
                                    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((rounds) => {
                                        return (
                                            <option 
                                                key={rounds} 
                                                value={rounds}
                                            >
                                                {rounds}
                                            </option>
                                        );
                                    })
                                }
                            </select>
                        </div>

                        <div className="w-full flex justify-between items-center">
                            <label 
                                htmlFor="maxNoOfLettersToReveal"
                                className="font-bold lg:font-semibold"
                            >
                                Hints:
                            </label>
                            <select 
                                id="maxNoOfLettersToReveal" 
                                required
                                onChange={handleChange}
                                value={createNewRoomFormData.maxNoOfLettersToReveal}
                                className="border rounded-xs md:rounded w-[75%] md:w-[80%] px-2 py-1"
                            >
                                {
                                    [0, 1, 2, 3, 4, 5].map((letterCount) => {
                                        return (
                                            <option 
                                                key={letterCount} 
                                                value={letterCount}
                                            >
                                                {letterCount}
                                            </option>
                                        );
                                    })
                                }
                            </select>
                        </div>
                    </div>
                    
                    <input 
                        type="submit"
                        disabled={isRunning}
                        value="Create new room"
                        className={
                            `mt-5 ${isRunning === false ? "bg-black cursor-pointer" : "bg-gray-400 cursor-not-allowed"} text-white w-full py-2  rounded-xs md:rounded-md font-bold lg:font-semibold`
                        }
                    >
                    </input>
                </form>

                <div className="w-full flex justify-evenly items-center my-4 md:my-0">
                    <div className="bg-black w-[45%] h-[2px]">
                    </div>
                    
                    <div className="font-semibold text-md">
                        OR
                    </div>

                    <div className="bg-black w-[45%] h-[2px]">
                    </div>
                </div>

                <form id="joinExistingRoomForm" onSubmit={handleSubmit}>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-full flex justify-between items-center">
                            <label 
                                htmlFor="playerName"
                                className="font-bold lg:font-semibold"
                            >
                                Name:
                            </label>
                            <input
                                id="playerName"
                                required
                                minLength={3}
                                maxLength={8}
                                pattern="[a-zA-Z0-9_]+"
                                onChange={handleChange}
                                title="Name can contain only letters, numbers, and underscores"
                                value={joinExistingRoomFormData.playerName}
                                placeholder="Enter your name"
                                className="border rounded-xs md:rounded w-[75%] md:w-[80%] px-2 py-1"
                            >
                            </input>
                        </div>

                        <div className="w-full flex justify-between items-center">
                            <label 
                                htmlFor="roomId"
                                className="font-bold lg:font-semibold"
                            >
                                Room Id:
                            </label>
                            <input
                                id="roomId"
                                required
                                onChange={handleChange}
                                minLength={36}
                                maxLength={36}
                                pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
                                title="Must be a valid 36-character Room ID"
                                value={joinExistingRoomFormData.roomId}
                                placeholder="Enter room id"
                                className="border rounded-xs md:rounded w-[75%] md:w-[80%] px-2 py-1"
                            >
                            </input>
                        </div>
                    </div>

                    <input 
                        type="submit"
                        disabled={isRunning}
                        value="Join existing room"
                        className={
                            `mt-5 ${isRunning === false ? "bg-black cursor-pointer" : "bg-gray-400 cursor-not-allowed"} text-white w-full py-2 rounded-xs md:rounded-md font-bold lg:font-semibold`
                        }
                    >
                    </input>
                </form>
            </div>
        </div>
    );
}

export default Home;