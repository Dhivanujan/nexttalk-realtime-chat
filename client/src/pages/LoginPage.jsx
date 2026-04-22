import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(identifier, password);
      navigate("/chat");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Welcome Back</h1>
        <p>Sign in to continue chatting in real-time.</p>
        <input
          type="text"
          placeholder="Email or phone"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <div className="error-text">{error}</div>}
        <button disabled={submitting} type="submit">
          {submitting ? "Signing in..." : "Login"}
        </button>
        <p>
          Need an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
