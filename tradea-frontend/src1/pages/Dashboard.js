import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("user_id");

    if (!token || !userId) {
      navigate('/');
      return;
    }

    fetch("http://localhost:8000/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.error("Failed to fetch user:", err));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Welcome to Tradea, {user?.username || "..."}</h1>
      <p><strong>Email:</strong> {user?.email}</p>
      <p><strong>Trust Score:</strong> {user?.trust_score}</p>
      <p><strong>Overlap Score:</strong> {user?.overlap_score}</p>
      <p><strong>Total Likes:</strong> {user?.total_likes}</p>

      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Link to="/products">
          <button style={buttonStyle}>Go to Product Feed</button>
        </Link>
        <Link to="/profile">
          <button style={buttonStyle}>View Your Profile</button>
        </Link>
        <Link to="/messages">
          <button style={buttonStyle}>Check Messages</button>
        </Link>
        <button onClick={handleLogout} style={{ ...buttonStyle, backgroundColor: '#e74c3c' }}>
          Logout
        </button>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: '0.75rem 1.5rem',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 'bold'
};

export default Dashboard;