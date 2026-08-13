import { useState } from 'react';

function InboxSidebar({ chatRequests, ongoingTrades, pastTrades, selectedChat, setSelectedChat }) {
  const [expanded, setExpanded] = useState({
    requested: true,
    ongoing: true,
    past: true,
  });

  const toggle = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSection = (key, title, chats) => (
    <div className="inbox-section">
      <h3 onClick={() => toggle(key)} style={{ cursor: "pointer" }}>
        {expanded[key] ? "▼" : "▶"} {title}
      </h3>
      {expanded[key] && chats.map(chat => (
        <div
          key={chat.chat_id}
          className={`chat-card ${selectedChat?.chat_id === chat.chat_id ? "active" : ""}`}
          onClick={() => setSelectedChat(chat)}
        >
          <img src={chat.avatar_url || "https://via.placeholder.com/40"} className="avatar" />
          <div className="chat-info">
            <div className="chat-username">{chat.username}</div>
            <div className="chat-preview">{chat.initial_message || "No messages yet"}</div>
          </div>
          <div className="chat-status">{chat.status}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="inbox-sidebar">
      {renderSection("requested", "Requested Trades", chatRequests)}
      {renderSection("ongoing", "Ongoing Trades", ongoingTrades)}
      {renderSection("past", "Past Trades", pastTrades)}
    </div>
  );
}

export default InboxSidebar;