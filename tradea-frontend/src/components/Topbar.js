// src/components/Topbar.js
import "./Topbar.css";

function Topbar() {
  return (
    <header className="topbar">
      <h1>Tradea</h1>
      <nav className="topbar-nav">
        <button>🔔</button>
        <button>👤</button>
      </nav>
    </header>
  );
}

export default Topbar;