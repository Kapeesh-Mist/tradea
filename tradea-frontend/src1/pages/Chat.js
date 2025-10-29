import { useParams, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';

const Chat = () => {
  const { user_id } = useParams();
  const location = useLocation();
  const postId = new URLSearchParams(location.search).get("post");

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [tradeConfirmed, setTradeConfirmed] = useState(false);

  const token = localStorage.getItem("token");
  const currentUserId = parseInt(localStorage.getItem("user_id"));
  const chatBoxRef = useRef(null);

  // Finalize trade after countdown
  const finalizeTrade = useCallback(() => {
    fetch("http://localhost:8000/trade/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        buyer_id: currentUserId,
        seller_id: parseInt(user_id),
        post_id: parseInt(postId),
      }),
    })
      .then(res => res.json())
      .then(data => {
        setTradeConfirmed(true);
        setShowModal(false);
        alert("Trade confirmed and initiated!");
      })
      .catch(err => console.error("Failed to initiate trade:", err));
  }, [currentUserId, user_id, postId, token]);

  // Fetch messages
  useEffect(() => {
    if (!token || !user_id || !postId) return;

    fetch(`http://localhost:8000/chat/${user_id}?post=${postId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setMessages(Array.isArray(data.chat) ? data.chat : []);
      })
      .catch(err => console.error("Failed to fetch chat:", err));
  }, [user_id, postId, token]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Countdown logic
  useEffect(() => {
    if (!showModal || countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, showModal]);

  // Trigger finalizeTrade when countdown ends
  useEffect(() => {
    if (countdown === 0 && showModal) {
      finalizeTrade();
    }
  }, [countdown, showModal, finalizeTrade]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setIsSending(true);

    fetch(`http://localhost:8000/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiver_id: parseInt(user_id),
        message: newMessage,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
        setNewMessage("");
      })
      .catch(err => console.error("Failed to send message:", err))
      .finally(() => setIsSending(false));
  };

  const handleProceedToTrade = () => {
    setShowModal(true);
    setCountdown(10);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Chat with User {user_id}</h1>
      {postId && <p>About Post ID: {postId}</p>}

      <div
        ref={chatBoxRef}
        id="chat-box"
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          backgroundColor: '#f9f9f9'
        }}
      >
        {messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          messages.map((msg, index) =>
            msg && msg.from ? (
              <div key={index} style={{ marginBottom: '1rem' }}>
                <div>
                  <strong>{msg.from === currentUserId ? "You" : `User ${msg.from}`}:</strong> {msg.message}
                </div>
                {msg.timestamp && (
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>
                    {new Date(msg.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            ) : null
          )
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          onClick={handleSendMessage}
          disabled={isSending}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button
          onClick={handleProceedToTrade}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Proceed to Trade
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <h2>Confirm Trade Terms</h2>
            <p>By proceeding, you agree to deliver the product and accept Tradea’s terms.</p>
            <p>Finalizing in <strong>{countdown}</strong> seconds...</p>
            <button
              onClick={() => setShowModal(false)}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;