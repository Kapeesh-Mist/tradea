import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === "signup") setIsLogin(false);
    if (mode === "login") setIsLogin(true);
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordRegex = /^(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      alert("Password must be at least 6 characters and include a number.");
      return;
    }

    const payload = isLogin
      ? { email, password }
      : { username, email, password };

    const endpoint = isLogin
      ? "http://localhost:8000/auth/login"
      : "http://localhost:8000/auth/signup";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log(data);

      if (res.status === 404 && isLogin) {
        alert("Email not found. Please sign up first.");
        return;
      }

      if (res.status === 409 && !isLogin) {
        alert("Email already exists. Try logging in.");
        return;
      }

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("username", data.username);

        console.log(`${isLogin ? "Login" : "Signup"} successful`);
        navigate("/dashboard");
      } else {
        alert(`${isLogin ? "Login" : "Signup"} failed. Check your credentials.`);
      }
    } catch (err) {
      console.error("Request failed:", err);
      alert("Something went wrong. Try again.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "400px", margin: "auto" }}>
      <h1>{isLogin ? "Login" : "Signup"} to Tradea</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {!isLogin && (
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", paddingRight: "2.5rem" }}
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "0.5rem",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              fontSize: "0.9rem",
              color: "#007bff",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </span>
        </div>
        <button type="submit">{isLogin ? "Login" : "Signup"}</button>
      </form>

      <p style={{ marginTop: "1rem" }}>
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          style={{ color: "blue", background: "none", border: "none", cursor: "pointer" }}
        >
          {isLogin ? "Signup" : "Login"}
        </button>
      </p>
    </div>
  );
}

export default AuthPage;