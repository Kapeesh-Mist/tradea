import { NavLink, useNavigate } from 'react-router-dom';


function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: '#222',
      color: 'white',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
        Tradea Dev
      </div>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <NavLink to="/dashboard" style={navLinkStyle}>Dashboard</NavLink>
        <NavLink to="/products" style={navLinkStyle}>Products</NavLink>
        <NavLink to="/profile" style={navLinkStyle}>Profile</NavLink>
        <NavLink to="/messages" style={navLinkStyle}>Messages</NavLink>
        <button onClick={handleLogout} style={{
          backgroundColor: '#e74c3c',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

// ✅ React Router v6-compatible style function
const navLinkStyle = ({ isActive }) => ({
  color: 'white',
  textDecoration: 'none',
  fontWeight: '500',
  borderBottom: isActive ? '2px solid #00bcd4' : 'none'
});

export default Navbar;