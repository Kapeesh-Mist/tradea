import { Link } from "react-router-dom";
// import "./dashboard.css"; // Removed in favor of Tailwind // We'll create this if needed, or rely on global styles

function Dashboard() {
  const username = localStorage.getItem("username") || "User";

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Welcome, {username}!</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/profile" className="group p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">👤 Your Profile</h3>
          <p className="text-slate-600 text-sm">View and edit your profile details.</p>
        </Link>
        <Link to="/productpage" className="group p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">🛍️ Marketplace</h3>
          <p className="text-slate-600 text-sm">Browse products and find great deals.</p>
        </Link>
        <Link to="/messagespage" className="group p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">💬 Messages</h3>
          <p className="text-slate-600 text-sm">Check your chats and trade requests.</p>
        </Link>
        <Link to="/upload" className="group p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">➕ Upload Post</h3>
          <p className="text-slate-600 text-sm">List a new item for trade or sale.</p>
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;