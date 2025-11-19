import './messagespage.css';

function InboxSidebar({ chatRequests, ongoingTrades, pastTrades, selectedChat, setSelectedChat }) {
  const renderSection = (title, chats) => (
    <div className="inbox-section">
      <h3>{title}</h3>
      {chats.map(chat => (
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
      {renderSection("📨 Requested Trades", chatRequests)}
      {renderSection("🔄 Ongoing Trades", ongoingTrades)}
      {renderSection("📁 Past Trades", pastTrades)}
    </div>
  );
}

export default InboxSidebar;