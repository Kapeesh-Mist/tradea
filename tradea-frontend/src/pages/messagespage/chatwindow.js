import { useEffect, useState, useRef, useCallback } from 'react';
import MessageInput from './messageinput';
import './messagespage.css';

function ChatWindow({ chat, chatStatus }) {
  const chatId = chat?.chat_id;
  const requestId = chat?.request_id;
  const username = chat?.username;
  const [messages, setMessages] = useState([]);
  const [userId] = useState(Number(localStorage.getItem("user_id")));
  const token = localStorage.getItem("token");
  const [isOwner, setIsOwner] = useState(false);
  const [tradeId, setTradeId] = useState(null);
  const [tradeCancelled, setTradeCancelled] = useState(false);
  const chatEndRef = useRef(null);

  // 🧠 Scroll to bottom on new message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 🧠 Fetch messages
  useEffect(() => {
    if (!chatId || !requestId || !token) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`http://localhost:8000/chat/${requestId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setMessages(data.chat || []);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };
    fetchMessages();
  }, [chatId, requestId, chatStatus, token]);

  // 🧠 Check ownership
  const checkOwnership = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8000/trade-request/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.owner_id === userId) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error("Failed to check ownership:", err);
    }
  }, [requestId, userId, token]);

  useEffect(() => {
    if (requestId) checkOwnership();
  }, [requestId, checkOwnership]);

  // 🧠 Check trade status
  useEffect(() => {
    const fetchTradeStatus = async () => {
      try {
        const res = await fetch(`http://localhost:8000/trade/status?chat_id=${chatId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.trade_id && !data.cancelled) {
          setTradeId(data.trade_id);
          setTradeCancelled(false);
        } else {
          setTradeId(null);
          setTradeCancelled(true);
        }
      } catch (err) {
        console.error("Failed to fetch trade status:", err);
      }
    };
    if (chatId) fetchTradeStatus();
  }, [chatId]);

  // 🧠 Start trade
  const handleStartTrade = async () => {
    try {
      const res = await fetch("http://localhost:8000/trade/initiate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: new URLSearchParams({
          buyer_id: userId,
          seller_id: isOwner ? userId : chat?.other_user_id,
          item: "Custom Item",
          price: "0"
        })
      });
      const data = await res.json();
      setTradeId(data.trade_id);
      setTradeCancelled(false);
    } catch (err) {
      console.error("Failed to initiate trade:", err);
    }
  };

  // 🧠 Send message
  const handleSend = async (message) => {
    try {
      const res = await fetch("http://localhost:8000/chat/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ trade_request_id: requestId, message })
      });
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // 🧠 Accept trade
  const acceptRequest = async () => {
    try {
      await fetch(`http://localhost:8000/trade-request/${requestId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => [...prev, {
        from: "system",
        message: "Trade accepted ✅",
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      console.error("Failed to accept trade:", err);
    }
  };

  // 🧠 Decline trade
  const declineRequest = async () => {
    try {
      await fetch(`http://localhost:8000/trade-request/${requestId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => [...prev, {
        from: "system",
        message: "Trade declined ❌",
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      console.error("Failed to decline trade:", err);
    }
  };

  return (
    <div className="chat-window">
      {!chatId ? (
        <p>Select a chat to start messaging</p>
      ) : (
        <>
          <div className="chat-header">Chat with {username}</div>

          {/* 🔹 Trade bar or start button */}
          <div className="trade-launch">
            {!tradeId ? (
              <button onClick={handleStartTrade}>🚀 Start Trade</button>
            ) : (
              <div className="trade-bar">
                <span>Trade Active</span>
                <button onClick={() => window.location.href = `/trade/${tradeId}`}>View Trade</button>
              </div>
            )}
          </div>

          <div className="chat-history">
            {messages.length === 0 && <p className="empty-chat">No messages yet</p>}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.from === userId ? "sent" : msg.from === "system" ? "system" : "received"}`}>
                {msg.message}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* 🔹 Buyer can send first message if status is 'requested' */}
          {chatStatus === "requested" && !isOwner && (
            <MessageInput onSend={handleSend} />
          )}

          {/* 🔹 Seller sees Accept/Decline buttons if status is 'requested' */}
          {chatStatus === "requested" && isOwner && (
            <div className="chat-actions">
              <button onClick={acceptRequest}>✅ Accept</button>
              <button onClick={declineRequest}>❌ Decline</button>
            </div>
          )}

          {/* 🔹 After acceptance, both can chat freely */}
          {chatStatus === "accepted" && (
            <MessageInput onSend={handleSend} />
          )}
        </>
      )}
    </div>
  );
}

export default ChatWindow;