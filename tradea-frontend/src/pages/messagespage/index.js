import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import InboxSidebar from './inboxsidebar';
import ChatWindow from './chatwindow';
import './messagespage.css';

function MessagesPage() {
  const location = useLocation();
  const [chatRequests, setChatRequests] = useState([]);
  const [ongoingTrades, setOngoingTrades] = useState([]);
  const [pastTrades, setPastTrades] = useState([]);
  const [selectedChat, setSelectedChat] = useState(location.state?.chat || null);
  const [chatStatus, setChatStatus] = useState(location.state?.chat?.status || null);
  const token = localStorage.getItem("token");

  // ✅ Memoized fetchChatStatus to avoid ESLint warning
  const fetchChatStatus = useCallback(async (requestId) => {
    try {
      const res = await fetch(`http://localhost:8000/trade-request/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status && data.status !== chatStatus) {
        setChatStatus(data.status);
        setSelectedChat(prev => ({ ...prev, status: data.status }));
      }
    } catch (err) {
      console.error("Failed to refresh chat status:", err);
    }
  }, [chatStatus, token]);

  // 🔄 Auto-refresh chat status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedChat?.request_id) {
        fetchChatStatus(selectedChat.request_id);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedChat, fetchChatStatus]);

  // 📥 Load inbox on mount
  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const res = await fetch("http://localhost:8000/messages/inbox", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setChatRequests(data.chat_requests || []);
        setOngoingTrades(data.ongoing_trades || []);
        setPastTrades(data.past_trades || []);

        // Auto-select chat if redirected with chat context
        if (location.state?.chat) {
          const incomingChat = location.state.chat;
          setSelectedChat(incomingChat);
          setChatStatus(incomingChat.status);
        }
      } catch (err) {
        console.error("Failed to load inbox:", err);
      }
    };
    fetchInbox();
  }, [location.state, token]);

  return (
    <div className="messages-page">
      <InboxSidebar
        chatRequests={chatRequests}
        ongoingTrades={ongoingTrades}
        pastTrades={pastTrades}
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
      />
      <ChatWindow chat={selectedChat} chatStatus={chatStatus} />
    </div>
  );
}

export default MessagesPage;