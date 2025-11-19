import { useState } from 'react';

function MessageInput({ onSend }) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSend(trimmed);
      setText("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="message-input">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="message-textbox"
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="send-button"
      >
        Send
      </button>
    </div>
  );
}

export default MessageInput;