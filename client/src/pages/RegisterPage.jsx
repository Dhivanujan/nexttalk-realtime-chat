import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register(name, identifier, password);
      navigate("/chat");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to register");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create Account</h1>
        <p>Start your MERN chat workspace.</p>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
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
          {submitting ? "Creating..." : "Register"}
        </button>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
