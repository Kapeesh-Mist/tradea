import { Link } from "react-router-dom";
import "./dashboard.css"; // We'll create this if needed, or rely on global styles

function Dashboard() {
  const username = localStorage.getItem("username") || "User";

  return (
    <div className="dashboard-container">
      <h1>Welcome, {username}!</h1>
      <div className="dashboard-grid">
        <Link to="/profile" className="dashboard-card">
          <h3>👤 Your Profile</h3>
          <p>View and edit your profile details.</p>
        </Link>
        <Link to="/productpage" className="dashboard-card">
          <h3>🛍️ Marketplace</h3>
          <p>Browse products and find great deals.</p>
        </Link>
        <Link to="/messagespage" className="dashboard-card">
          <h3>💬 Messages</h3>
          <p>Check your chats and trade requests.</p>
        </Link>
        <Link to="/upload" className="dashboard-card">
          <h3>➕ Upload Post</h3>
          <p>List a new item for trade or sale.</p>
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;