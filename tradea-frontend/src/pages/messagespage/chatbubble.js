function ChatBubble({ sender, content }) {
  return (
    <div className={`chat-bubble ${sender === "me" ? "sent" : "received"}`}>
      {content}
    </div>
  );
}

export default ChatBubble;