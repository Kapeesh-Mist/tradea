import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import CTAButton from "../components/CTAButton";
import StoryboardCard from "../components/Storyboard";
// import "./homepage.css"; // Removed in favor of Tailwind

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="font-sans text-slate-900 bg-white min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="flex justify-between items-center px-8 py-4 bg-white/90 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-50">
        <div className="text-2xl font-bold tracking-tight text-slate-900 cursor-pointer" onClick={() => navigate("/")}>Tradea</div>
        <nav className="flex gap-4">
          <button
            onClick={() => navigate("/auth?mode=login")}
            className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/auth?mode=signup")}
            className="px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-all hover:shadow-md"
          >
            Sign Up
          </button>
        </nav>
      </header>
      {/* Hero Section */}
      <section className="text-center py-20 px-6 bg-slate-50 border-b border-slate-100">
        <h1 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Trade with <span className="text-primary-600">Trust</span></h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
          Scam-resistant, creator-first trading platform with gated chat, escrow logic, and transparent workflows.
        </p>
        <div className="flex justify-center gap-4">
          <CTAButton label="Join Tradea" onClick={() => navigate("/auth")} />
          <CTAButton label="Explore Posts" onClick={() => navigate("/products")} />
        </div>
      </section>

      {/* Who Can Use Tradea */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Who Can Use Tradea?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <StoryboardCard
            title="🎨 Freelancers & Creators"
            description="Send trade requests, protect your work, and chat only after acceptance."
          />
          <StoryboardCard
            title="🧑‍💼 Buyers & Clients"
            description="Browse posts, request services, and pay only when terms are met."
          />
          <StoryboardCard
            title="🏢 Startups & Institutions"
            description="Manage service contracts with escrow logic and legal clarity."
          />
          <StoryboardCard
            title="🧑‍🏫 Educators & Mentors"
            description="Offer paid sessions or resources with transparent delivery flows."
          />
        </div>
      </section>

      {/* Storyboard: Full User Experience */}
      <section className="py-20 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto w-full">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">How Tradea Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <StoryboardCard
              title="🔍 Discover"
              description="Browse posts from creators offering services you need."
            />
            <StoryboardCard
              title="📩 Send Trade Request"
              description="Propose terms and wait for acceptance. No ghosting, no pressure."
            />
            <StoryboardCard
              title="🔓 Chat Unlocks"
              description="Once accepted, chat opens for real-time collaboration."
            />
            <StoryboardCard
              title="🔐 Escrow Activation"
              description="Tradea holds assets securely until delivery is confirmed."
            />
            <StoryboardCard
              title="✅ Confirm & Complete"
              description="Confirm delivery, release escrow, and rate the experience."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-200">
        <div className="text-center">
          <p className="text-slate-500 mb-6">© 2025 Tradea. Built for trust.</p>
          <div className="flex justify-center gap-8 text-sm font-medium text-slate-600">
            <Link to="/about" className="hover:text-primary-600 transition-colors">About</Link>
            <Link to="/terms" className="hover:text-primary-600 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-primary-600 transition-colors">Privacy</Link>
            <Link to="/contact" className="hover:text-primary-600 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;