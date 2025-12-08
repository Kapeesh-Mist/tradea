import React, { useState, useEffect, useRef } from 'react';

const ChatPanel = ({ requestId, otherUser }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const token = localStorage.getItem('token');
    const userId = Number(localStorage.getItem('user_id'));
    const chatEndRef = useRef(null);
    console.log("📨 ChatPanel requestId:", requestId);
    console.log("📨 ChatPanel otherUser:", otherUser);
    useEffect(() => {
        if (!requestId || !token) return;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`http://localhost:8000/chat/${requestId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setMessages(data.chat || []);
            } catch (err) {
                console.error('Failed to fetch messages:', err);
            }
        };

        fetchMessages();
    }, [requestId, token]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        try {
            const res = await fetch('http://localhost:8000/chat/send', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ trade_request_id: requestId, message: input })
            });
            const data = await res.json();
            setMessages(prev => [...prev, data.message]);
            setInput('');
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {otherUser.avatar_url ? (
                        <img
                            src={otherUser.avatar_url}
                            alt="avatar"
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            {otherUser.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-gray-800">{otherUser.name || 'User'}</h3>
                        <p className="text-xs text-green-500">Online</p>
                    </div>
                </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-10">
                        Start a conversation...
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`mb-2 flex ${msg.from === userId ? 'justify-end' : 'justify-start'
                                }`}
                        >
                            <div
                                className={`inline-block px-3 py-2 rounded-lg shadow text-sm ${msg.from === userId
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-800'
                                    }`}
                            >
                                {msg.message}
                            </div>
                        </div>
                    ))
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Send message..."
                        className="flex-1 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        onClick={handleSend}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;