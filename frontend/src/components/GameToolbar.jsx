import { useState } from "react";

import UndoIcon from "../components/UndoIcon.jsx";
import TrashIcon from "../components/TrashIcon.jsx";
import StrokeWidthIcon from "../components/StrokeWidthIcon.jsx";

import { handleUndoStroke, handleClearCanvas} from "../helpers/canvas.js";

const brushColors = [
    "rgb(255, 255, 255)",
    "rgb(193, 193, 193)",
    "rgb(239, 19, 11)",
    "rgb(255, 113, 0)",
    "rgb(255, 228, 0)",
    "rgb(0, 204, 0)",
    "rgb(0, 255, 145)",
    "rgb(0, 178, 255)",
    "rgb(35, 31, 211)",
    "rgb(163, 0, 186)",
    "rgb(223, 105, 167)",
    "rgb(255, 172, 142)",
    "rgb(160, 82, 45)",
    "rgb(0, 0, 0)",
    "rgb(80, 80, 80)",
    "rgb(116, 11, 7)",
    "rgb(194, 56, 0)",
    "rgb(232, 162, 0)",
    "rgb(0, 70, 25)",
    "rgb(0, 120, 93)",
    "rgb(0, 86, 158)",
    "rgb(14, 8, 101)",
    "rgb(85, 0, 105)",
    "rgb(135, 53, 84)",
    "rgb(204, 119, 77)",
    "rgb(99, 48, 13)"
]

const strokeWidthOptions = [8, 6, 4, 2];

function GameToolbar({ 
    gameState, 
    strokeSettings, 
    setStrokeSettings,
    playerName, 
    canvasRef, 
    pathDrawingHistoryRef, 
    sendRef
})
{
    const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);

    return (
        <div 
            className="flex justify-between w-[60%]"
        >
            <div className="w-[70%] flex justify-evenly h-12">
                <div 
                    style={{ backgroundColor: strokeSettings.color }}
                    className="flex w-[8%] h-full rounded border-2 border-white"
                >
                </div>

                <div className="flex flex-col w-[70%] h-full">
                    {
                        [0, 1].map((item) => {
                            const spliceStartIdx = item == 0 ? 0 : brushColors.length / 2;
                            const spliceEndIdx = item == 0 ? brushColors.length / 2 : brushColors.length;

                            return (
                                <div
                                    key={item}
                                    className="w-full h-[50%] flex"
                                >
                                    {
                                        brushColors.slice(spliceStartIdx, spliceEndIdx)
                                        .map((color) => {
                                            return (
                                                <button
                                                    key={color}
                                                    style={{ backgroundColor: color }}
                                                    className="w-[7.7%] h-full transition-transform duration-150 hover:scale-125 hover:z-10 cursor-pointer"
                                                    onClick={(event) => {
                                                        setStrokeSettings((prevStrokeSettings) => {
                                                            return {
                                                                ...prevStrokeSettings,
                                                                color: color
                                                            };
                                                        })
                                                    }}
                                                >
                                                </button>
                                            )
                                        })
                                    }
                                </div>
                            )
                        })
                    }   
                </div>
                
                <div
                    className="relative flex w-[15%] h-full select-none"
                >
                    <div 
                        onClick={(event) => {
                            setIsDropdownMenuOpen(
                                isDropdownMenuOpen === true ? false : true
                            );
                        }}
                        className="flex w-full bg-white rounded flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                        <StrokeWidthIcon
                            size={strokeSettings.width}
                        >
                        </StrokeWidthIcon>
                    </div>

                    {
                        isDropdownMenuOpen === true ?
                        <div
                            className="absolute bottom-full w-full mb-1 rounded bg-white shadow-md flex flex-col z-20 overflow-hidden"
                        >
                            {
                                strokeWidthOptions.map((width) => {
                                    return (
                                        <div
                                            key={width}
                                            className="bg-white hover:bg-gray-200 flex items-center justify-center transition-colors py-2 cursor-pointer"
                                            onClick={(event) => {
                                                setStrokeSettings((prevStrokeSettings) => {
                                                    return {
                                                        ...prevStrokeSettings,
                                                        width: width
                                                    };
                                                });

                                                setIsDropdownMenuOpen(false);
                                            }}
                                        >
                                            <StrokeWidthIcon
                                                size={width}
                                            >
                                            </StrokeWidthIcon>
                                        </div>
                                    )
                                })
                            }
                        </div>
                        :
                        <></>
                    }
                </div>
            </div>

            <div className="flex justify-evenly w-[15%] h-12">
                <button 
                    onClick={(event) => {
                        if(playerName !== gameState.sketcherName)
                            return;
                        
                        handleClearCanvas(
                            canvasRef,
                            pathDrawingHistoryRef,
                            sendRef
                        );
                    }}
                    className="bg-white cursor-pointer text-lg font-semibold rounded h-full px-2.5 hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                    <TrashIcon>
                    </TrashIcon>
                </button>
            
                <button 
                    onClick={(event) => {
                        if(playerName !== gameState.sketcherName)
                            return;
                        
                        handleUndoStroke(
                            canvasRef,
                            pathDrawingHistoryRef,
                            sendRef
                        );
                    }}
                    className="bg-white cursor-pointer text-lg font-semibold rounded h-full px-2.5 hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                    <UndoIcon>
                    </UndoIcon>
                </button>
            </div>
        </div>
    );
}

export default GameToolbar;