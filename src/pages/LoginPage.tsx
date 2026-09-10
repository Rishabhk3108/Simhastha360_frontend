import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
      navigate("/admin");
    } catch (err: any) {
      if (err instanceof Error && err.message === "not-admin") {
        setError("This account can't sign in to the Command Centre. Volunteers and field team members sign in through the mobile app instead.");
      } else if (err.response?.status === 401) {
        setError("Invalid phone or password.");
      } else {
        setError("Couldn't reach the server. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="centered-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="brand-mark">
          <div className="brand-seal" />
          <div>
            <div className="brand-title">Simhastha 360</div>
            <div className="brand-subtitle">Ujjain 2028</div>
          </div>
        </div>
        <p className="muted" style={{ marginTop: -8 }}>
          Command Centre sign in
        </p>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
