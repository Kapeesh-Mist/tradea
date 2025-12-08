import { useEffect, useState, useRef, useCallback } from 'react';
import MessageInput from './messageinput';
import './messagespage.css';

function ChatWindow({ chat, chatStatus, currentChatId, isSidebarMode }) {
  const chatId = chat?.chat_id || currentChatId;
  const requestId = chat?.request_id;
  const username = chat?.username || "User";
  const otherUserId = chat?.other_user_id;

  const [messages, setMessages] = useState([]);
  const [userId] = useState(Number(localStorage.getItem("user_id")));
  const token = localStorage.getItem("token");
  const [isOwner, setIsOwner] = useState(false);
  const [tradeId, setTradeId] = useState(null);
  const [hasStartedTrade, setHasStartedTrade] = useState(false);
  const [otherPartyStarted, setOtherPartyStarted] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    setTradeId(null);
    setHasStartedTrade(false);
    setOtherPartyStarted(false);
  }, [chatId, requestId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        console.error("Failed to fetch messages:", err);
      }
    };
    fetchMessages();
  }, [requestId, token]);

  const checkOwnership = useCallback(async () => {
    if (!requestId) return;
    try {
      const res = await fetch(`http://localhost:8000/trade-request/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setIsOwner(data.owner_id === userId);
    } catch (err) {
      console.error("Failed to check ownership:", err);
    }
  }, [requestId, token, userId]);

  useEffect(() => {
    if (requestId) checkOwnership();
  }, [requestId, checkOwnership]);

  const checkTradeIntent = useCallback(async () => {
    if (!requestId) return;
    try {
      const res = await fetch(`http://localhost:8000/trade-intent?request_id=${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const buyerStarted = data.buyer_started;
      const sellerStarted = data.seller_started;

      const iStarted = isOwner ? sellerStarted : buyerStarted;
      const theyStarted = isOwner ? buyerStarted : sellerStarted;

      setHasStartedTrade(iStarted);
      setOtherPartyStarted(theyStarted);
      console.log("🧪 Checking trade intent:", { buyerStarted, sellerStarted });

      const statusRes = await fetch(`http://localhost:8000/trade/status?request_id=${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await statusRes.text();
      console.log("📦 Raw response from /trade/status:", text);

      let statusData;
      try {
        statusData = JSON.parse(text);
      } catch (err) {
        console.error("❌ Failed to parse JSON from /trade/status:", err);
        return;
      }

      if (buyerStarted && sellerStarted) {
        if (statusData.status === "not_found" || !statusData.trade_id) {
          const payload = {
            request_id: String(requestId),
            buyer_demand: "",
            seller_demand: ""
          };

          console.log("🛰️ Trade initiation payload:", payload);

          try {
            const res = await fetch("http://localhost:8000/trade/initiate", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: new URLSearchParams(payload)
            });

            const data = await res.json();
            console.log("✅ Trade initiation response:", data);

            if (data.trade_id) {
              setTradeId(data.trade_id);
            } else {
              console.warn("⚠️ Trade initiation succeeded but no trade_id returned:", data);
            }
          } catch (err) {
            console.error("❌ Trade initiation failed:", err);
          }
        } else {
          setTradeId(statusData.trade_id);
        }
      } else {
        setTradeId(statusData.trade_id);
      }
    } catch (err) {
      console.error("Failed to check trade intent:", err);
    }
  }, [requestId, isOwner, token]);

  useEffect(() => {
    checkTradeIntent();
  }, [checkTradeIntent]);

  const handleStartIntent = async () => {
    if (!requestId) return;
    try {
      await fetch("http://localhost:8000/trade-intent", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          request_id: requestId,
          user_id: userId
        })
      });
      setHasStartedTrade(true);
      checkTradeIntent();
    } catch (err) {
      console.error("Failed to register trade intent:", err);
    }
  };

  const handleSend = async (message) => {
    if (!requestId) return;
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

  const acceptRequest = async () => {
    if (!requestId) return;
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

  const declineRequest = async () => {
    if (!requestId) return;
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
    <div className="chat-window h-full flex flex-col">
      {!chatId ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Select a chat to start messaging</p>
        </div>
      ) : (
        <>
          {!isSidebarMode && (
            <div className="chat-header">Chat with {username}</div>
          )}
          {!isSidebarMode && (
            <div className="trade-banner">
              {!tradeId ? (
                !hasStartedTrade ? (
                  otherPartyStarted ? (
                    <div className="trade-box info">
                      👋 The other party has started the trade.<br />
                      <button onClick={handleStartIntent} className="trade-button primary">
                        🚀 Click to continue
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleStartIntent} className="trade-button primary">
                      🚀 Start Trade
                    </button>
                  )
                ) : !otherPartyStarted ? (
                  <div className="trade-box warning">
                    ⏳ Waiting for other party to start...
                  </div>
                ) : null
              ) : (
                <div
                  onClick={() => {
                    localStorage.setItem("selected_trade_id", tradeId);
                    window.location.href = "/tradepage";
                  }}
                  className="trade-box success cursor-pointer"
                >
                  ⚡ View Trade
                </div>
              )}
            </div>
          )}
          <div className="chat-history">
            {messages.length === 0 && <p className="empty-chat">No messages yet</p>}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble ${msg.from === userId ? "sent" : msg.from === "system" ? "system" : "received"}`}
              >
                {msg.message}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {chatStatus === "requested" && !isOwner && (
            <div className="border-t p-4">
              <MessageInput onSend={handleSend} />
            </div>
          )}

          {chatStatus === "requested" && isOwner && (
            <div className="chat-actions flex space-x-2 p-4 border-t">
              <button
                onClick={acceptRequest}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition"
              >
                ✅ Accept
              </button>
              <button
                onClick={declineRequest}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition"
              >
                ❌ Decline
              </button>
            </div>
          )}

          {(chatStatus === "accepted" || isSidebarMode) && (
            <div className="border-t p-4">
              <MessageInput onSend={handleSend} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ChatWindow;