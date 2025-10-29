import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Make sure you're using React Router

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const navigate = useNavigate(); // For redirecting after login

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = isLogin
      ? { email, password }
      : { username, email, password };

    const endpoint = isLogin
      ? 'http://localhost:8000/auth/login'
      : 'http://localhost:8000/auth/signup';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log(data);

      if (data.access_token) {
        // ✅ Store token and user info
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('username', data.username);

        alert('Login successful!');
        console.log("Navigating to dashboard");
        setTimeout(() => navigate('/dashboard'), 100); // Redirect to dashboard
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Request failed:', err);
      alert('Something went wrong. Try again.');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{isLogin ? 'Login' : 'Signup'} to Tradea</h1>

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            type="text"
            name="username"
            id="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          name="email"
          id="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          name="password"
          id="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{isLogin ? 'Login' : 'Signup'}</button>
      </form>

      <p>
        {isLogin ? "Don't have an account?" : "Already have an account?"}
        <button type="button" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Signup' : 'Login'}
        </button>
      </p>
    </div>
  );
}

export default AuthPage;