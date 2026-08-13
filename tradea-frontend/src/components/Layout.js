// src/components/Layout.js
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
// import "./Layout.css"; // Removed in favor of Tailwind

function Layout() {
  const location = useLocation();
  const isMessagesPage = location.pathname === "/messagespage";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <Topbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className={`flex-1 overflow-y-auto w-full relative scroll-smooth ${isMessagesPage ? "" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;