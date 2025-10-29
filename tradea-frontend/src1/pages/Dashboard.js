// src/Dashboard.js
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
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
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    navigate('/');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome to Tradea, {user?.username || "..."}</h1>
      <p>Email: {user?.email}</p>
      <button onClick={handleLogout}>Logout</button>
      <hr />
      <Link to="/products">
        <button style={{ marginTop: '1rem' }}>Go to Product Feed</button>
      </Link>
    </div>
  );
}

export default Dashboard;