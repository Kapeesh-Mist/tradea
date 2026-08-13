import { NavLink, useNavigate } from "react-router-dom";
// import "./Sidebar.css"; // Removed in favor of Tailwind

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear(); // Clear token and user info
    console.log("User logged out");
    navigate("/auth?mode=login"); // Redirect to login
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
      ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-full flex flex-col z-30">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tradea</h2>
      </div>
      <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto">
        <NavLink to="/dashboard" className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/tradepage" className={linkClass}>
          Trades
        </NavLink>
        <NavLink to="/messagespage" className={linkClass}>
          Messages
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          Profile
        </NavLink>
        <NavLink to="/productpage" className={linkClass}>
          Products
        </NavLink>
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;