// src/components/Layout.js
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./Layout.css";

function Layout() {
  const location = useLocation();
  const isMessagesPage = location.pathname === "/messagespage";

  return (
    <div className="layout">
      <Topbar />
      <div className="layout-body">
        <Sidebar />
        <div className={`layout-scroll-area ${isMessagesPage ? "messages-scroll-area" : ""}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;