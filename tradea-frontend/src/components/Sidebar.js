import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear(); // Clear token and user info
    console.log("User logged out");
    navigate("/auth?mode=login"); // Redirect to login
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className="sidebar-link">
          Dashboard
        </NavLink>
        <NavLink to="/tradepage" className="sidebar-link">
          Trades
        </NavLink>
        <NavLink to="/messagespage" className="sidebar-link">
          Messages
        </NavLink>
        <NavLink to="/profile" className="sidebar-link">
          Profile
        </NavLink>
        <NavLink to="/productpage" className="sidebar-link">
          Products
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;