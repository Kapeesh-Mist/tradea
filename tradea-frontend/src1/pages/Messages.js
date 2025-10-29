import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function Messages() {
  const [requests, setRequests] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [customDemand, setCustomDemand] = useState("");
  const [pendingPostId, setPendingPostId] = useState(null);
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("user_id");
  const location = useLocation();

  // Detect redirect from product page with post_id
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const postId = params.get("post_id");
    if (postId) {
      setPendingPostId(postId);
    }
  }, [location]);

  // Fetch all trade requests (for freelancer inbox)
  useEffect(() => {
    fetch(`http://localhost:8000/user/${userId}/trade-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setRequests(data.requests || []))
      .catch(err => console.error("Failed to fetch requests:", err));
  }, [token, userId]);

  // Accept a trade request
  const handleAccept = async (requestId) => {
    try {
      await fetch(`http://localhost:8000/trade-request/${requestId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Trade accepted! You can now chat.");
      setActiveChatId(requestId);
      fetchMessages(requestId);
    } catch (err) {
      console.error("Failed to accept trade:", err);
    }
  };

  // Decline a trade request
  const handleDecline = async (requestId) => {
    try {
      await fetch(`http://localhost:8000/trade-request/${requestId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("❌ Trade request declined.");
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error("Failed to decline trade:", err);
    }
  };

  // Send a new trade request (buyer side)
  const handleSendTradeRequest = async () => {
    if (!customDemand.trim() || !pendingPostId) return;

    try {
      const res = await fetch(`http://localhost:8000/post/${pendingPostId}/trade-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          buyer_id: parseInt(userId),
          message: customDemand,
        }),
      });

      if (res.ok) {
        alert("✅ Trade request sent!");
        setPendingPostId(null);
        setCustomDemand("");
      } else {
        const error = await res.json();
        alert(`❌ Failed: ${error.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Failed to send trade request:", err);
    }
  };

  // Load messages for a given trade request
  const fetchMessages = (requestId) => {
    fetch(`http://localhost:8000/chat/${requestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setMessages(data.chat || []))
      .catch(err => console.error("Failed to fetch messages:", err));
  };

  // Send a message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeChatId) return;

    fetch(`http://localhost:8000/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        trade_request_id: activeChatId,
        message: newMessage,
      }),
    })
      .then(res => res.json())
      .then(data => {
        setMessages(prev => [...prev, data.message]);
        setNewMessage("");
      })
      .catch(err => console.error("Failed to send message:", err));
  };
return (
  <div style={{ display: 'flex', height: '100vh' }}>
    {/* Sidebar: Inbox */}
    <div style={{
      width: '300px',
      borderRight: '1px solid #ddd',
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <h2>Inbox</h2>
      {requests.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        requests.map((req) => (
          <div
            key={req.id}
            style={{
              padding: '0.75rem',
              borderBottom: '1px solid #eee',
              cursor: req.status === "accepted" ? "pointer" : "default"
            }}
            onClick={() => {
              if (req.status === "accepted") {
                setActiveChatId(req.id);
                fetchMessages(req.id);
              }
            }}
          >
            <strong>User {req.buyer_id}</strong>
            <p style={{ margin: '0.25rem 0' }}>{req.message}</p>
            <small>Post: {req.post_title}</small>
            {req.status === "pending" && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleAccept(req.id)}>✅ Accept</button>
                <button onClick={() => handleDecline(req.id)}>❌ Decline</button>
              </div>
            )}
            {req.status === "accepted" && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#28a745' }}>
                Accepted — click to chat
              </div>
            )}
          </div>
        ))
      )}
    </div>

    {/* Chat Area or Trade Request Composer */}
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem'
    }}>
      {pendingPostId ? (
        <>
          <h3>Send Trade Request</h3>
          <textarea
            value={customDemand}
            onChange={(e) => setCustomDemand(e.target.value)}
            placeholder="Type your demand or message to the freelancer..."
            style={{
              width: '100%',
              height: '150px',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              marginBottom: '1rem'
            }}
          />
          <button
            onClick={handleSendTradeRequest}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Send Request
          </button>
        </>
      ) : activeChatId ? (
        <>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid #ccc',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            {messages.length === 0 ? (
              <p>No messages yet.</p>
            ) : (
              messages.map((msg, index) => (
                <div key={index} style={{ marginBottom: '1rem' }}>
                  <strong>{msg.from === parseInt(userId) ? "You" : `User ${msg.from}`}:</strong> {msg.message}
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>
                    {new Date(msg.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
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
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Send
            </button>
          </div>
        </>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          color: '#888'
        }}>
          <p>Select a request to start chatting or send a new trade request.</p>
        </div>
      )}
    </div>
  </div>
);}

export default Messages;