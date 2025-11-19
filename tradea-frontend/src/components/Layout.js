// src/components/Layout.js
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./Layout.css";

function Layout() {
  return (
    <div className="layout">
      <Topbar />
      <div className="layout-body">
        <Sidebar />
        <div className="layout-scroll-area">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;