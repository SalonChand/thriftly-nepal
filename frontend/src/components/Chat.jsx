import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios'; // 1. Added Axios for history
import { Send, X, MessageSquare, Loader, Check } from 'lucide-react';

// Connect to Backend
const socket = io.connect("http://localhost:5000");

const Chat = ({ currentUser, sellerId, productId, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Create Room ID
    const participants = [currentUser.id, sellerId].sort();
    const roomId = `prod-${productId}-u${participants[0]}-u${participants[1]}`;

    // 🕒 HELPER: Format Time correctly
    const formatTime = (msg) => {
        // Use 'created_at' (DB) or 'time' (Live) or current time
        const dateStr = msg.created_at || msg.time || new Date().toISOString();
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if(currentUser) {
            console.log("🔌 Joining Room:", roomId);
            socket.emit('join_room', roomId);
            
            // 2. FETCH HISTORY FROM DB
            axios.get('http://localhost:5000/messages', {
                params: { 
                    sender_id: currentUser.id, 
                    receiver_id: sellerId, 
                    product_id: productId 
                },
                withCredentials: true
            }).then(res => {
                if(Array.isArray(res.data)) {
                    setMessages(res.data);
                }
                setLoading(false);
                setTimeout(scrollToBottom, 100);
            }).catch(err => {
                console.log("Error loading chat:", err);
                setLoading(false);
            });
        }

        const handleReceiveMessage = (data) => {
            setMessages((prev) => [...prev, data]);
            scrollToBottom();
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [roomId, currentUser]);

    // Scroll when messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (newMessage.trim() === "") return;

        // 3. Create Message Object
        const messageData = {
            room: roomId,
            sender_id: currentUser.id,
            receiver_id: sellerId,
            product_id: productId,
            message: newMessage,
            time: new Date().toISOString(), // Use ISO format for consistency
        };

        await socket.emit('send_message', messageData);
        setMessages((list) => [...list, messageData]);
        setNewMessage("");
        scrollToBottom();
    };

    return (
        <div className="fixed bottom-4 right-4 w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 flex flex-col h-96 animate-fade-in">
            {/* Header */}
            <div className="bg-stone-900 text-white p-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-orange-500" />
                    <div>
                        <span className="font-bold text-sm block">Live Chat</span>
                        <span className="text-[10px] text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="hover:bg-stone-700 p-1 rounded-full transition"><X size={16} /></button>
            </div>

            {/* Messages List */}
            <div className="flex-1 p-4 overflow-y-auto bg-[#FDFBF7] flex flex-col gap-3">
                {loading && <div className="flex justify-center p-4"><Loader className="animate-spin text-stone-400"/></div>}
                
                {messages.length === 0 && !loading && (
                    <div className="text-center mt-10">
                        <p className="text-xs text-stone-400">Say hello! 👋</p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-2xl max-w-[85%] shadow-sm relative ${
                            msg.sender_id === currentUser.id 
                            ? 'bg-orange-600 text-white rounded-tr-none' 
                            : 'bg-white border text-stone-800 rounded-tl-none'
                        }`}>
                            <p className="text-sm mb-1">{msg.message}</p>
                            
                            {/* 🕒 TIME DISPLAY */}
                            <div className={`text-[9px] flex items-center justify-end gap-1 ${
                                msg.sender_id === currentUser.id ? 'text-orange-200' : 'text-stone-400'
                            }`}>
                                {formatTime(msg)}
                                {msg.sender_id === currentUser.id && <Check size={10} />}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t flex gap-2 items-center">
                <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder="Type a message..." 
                    className="flex-1 p-2.5 bg-stone-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-orange-200 transition"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button 
                    onClick={sendMessage} 
                    className="bg-stone-900 text-white p-2.5 rounded-full hover:bg-orange-600 transition shadow-lg transform active:scale-90"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};

export default Chat;