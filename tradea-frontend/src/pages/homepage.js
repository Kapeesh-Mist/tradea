import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import CTAButton from "../components/CTAButton";
import StoryboardCard from "../components/Storyboard";
import "./homepage.css";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="homepage">
      {/* Top Navigation */}
        <header className="topbar">
        <div className="logo" onClick={() => navigate("/")}>Tradea</div>
        <nav className="nav-buttons">
          <button onClick={() => navigate("/auth?mode=login")}>Login</button>
          <button onClick={() => navigate("/auth?mode=signup")}>Sign Up</button>
        </nav>
      </header>
      {/* Hero Section */}
      <section className="hero">
        <h1>Trade with Trust</h1>
        <p>
          Scam-resistant, creator-first trading platform with gated chat, escrow logic, and transparent workflows.
        </p>
        <div className="cta-group">
          <CTAButton label="Join Tradea" onClick={() => navigate("/auth")} /> 
          <CTAButton label="Explore Posts" onClick={() => navigate("/products")} />
        </div>
      </section>

      {/* Who Can Use Tradea */}
      <section className="audience">
        <h2>Who Can Use Tradea?</h2>
        <div className="audience-grid">
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
      <section className="storyboard">
        <h2>How Tradea Works</h2>
        <div className="storyboard-grid">
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
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 Tradea. Built for trust.</p>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;