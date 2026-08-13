// src/components/Topbar.js
// import "./Topbar.css"; // Removed in favor of Tailwind

function Topbar() {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        {/* Placeholder for breadcrumbs or page title if needed */}
        {/* <span className="text-slate-400">/</span> */}
        {/* <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1> */}
      </div>
      <nav className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative">
          <span className="sr-only">Notifications</span>
          🔔
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <button className="p-1 pl-2 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
            👤
          </div>
        </button>
      </nav>
    </header>
  );
}

export default Topbar;