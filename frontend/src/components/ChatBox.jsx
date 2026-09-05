import { useRef, useState, useEffect } from "react";

import { sendChatMessage } from "../helpers/transport.js";

const chatColors = {
    default: "#000"
};
 
function ChatBox({ isReconnectingToServer, chatMessages, setChatMessages, playerName, sendRef })
{
    const chatBoxRef = useRef(null);
    const chatMessagesEndRef = useRef(null);
    const isUserScrolledUpRef = useRef(false);

    const lastSentChatMessageTimestampRef = useRef(0);
    const [chatBoxInput, setChatBoxInput] = useState("");

    useEffect(() => {
        if(isUserScrolledUpRef.current === false)
        {   
            chatMessagesEndRef.current?.scrollIntoView({
                behavior: "smooth"
            });
        }
    }, [chatMessages]);

    return (
        <div 
            className="w-[18%] h-[500px] py-1 rounded-sm bg-white/95 flex flex-col justify-between"
        >
            <div className="px-1.5">
                <div className="font-bold border-b">
                    Chats & Guesses
                </div>
            </div>

            <div 
                ref={chatBoxRef}
                onScroll={(event) => {
                    if(chatBoxRef.current == null)
                        return;

                    const chatBox = chatBoxRef.current;
                    isUserScrolledUpRef.current = (chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight) > 50 ? true : false;
                }}
                className="flex-1 overflow-y-auto"
            >
                <ul 
                    className="font-semibold flex flex-col mb-1.5 wrap-anywhere"
                >
                    {
                        chatMessages.map((message, idx) => {
                            return (
                                <li 
                                    key={idx}
                                    className="px-1.5 py-1"
                                    style={{ color: message.color }}
                                >
                                    {message.content}
                                </li>
                            );
                        })
                    }
                </ul>

                <div ref={chatMessagesEndRef}>
                </div>
            </div>
            
            <div 
                className="px-1"
            >
                <input 
                    type="text" 
                    onChange={(event) => {
                        setChatBoxInput(event.target.value);
                    }}
                    onKeyDown={(event) => {
                        if(event.key !== "Enter")
                            return;

                        event.preventDefault();

                        if(Date.now() - lastSentChatMessageTimestampRef.current < 250)
                            return;

                        const content = chatBoxInput.trim();
                        if(content.length < 1 || content.length > 100)
                            return;

                        lastSentChatMessageTimestampRef.current = Date.now();
                        sendChatMessage(sendRef, content);
                        
                        setChatBoxInput("");
                        setChatMessages((prevChatMessages) => {
                            return [
                                ...prevChatMessages, {
                                    color: chatColors.default,
                                    content: `${playerName}: ${content}`
                                }
                            ];
                        });
                    }}
                    maxLength={100}
                    value={chatBoxInput}
                    disabled={isReconnectingToServer === true ? true : false}
                    placeholder="Type your guess here..."
                    className="w-full border rounded-sm px-2 py-1"
                >
                </input>
            </div>
        </div>
    );
}

export default ChatBox;