import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { client } from "../api/client.js";

function decodePayload(token) {
  try {
    const segment = token.split(".")[1];
    if (!segment) {
      return null;
    }
    let base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function errorMessage(error) {
  if (error && error.status === 401) {
    return "E-Mail oder Passwort ist falsch.";
  }
  if (error && error.status === 429) {
    return "Zu viele Anmeldeversuche. Bitte versuchen Sie es in 15 Minuten erneut.";
  }
  if (error && error.detail) {
    return error.detail;
  }
  return "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.";
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await client.post("/auth/login", { email, password });
      const payload = decodePayload(data.access_token);
      const user = {
        id: payload && payload.sub != null ? Number(payload.sub) : null,
        email,
      };
      login(data.access_token, user);
      navigate("/wardrobe", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page container">
      <div className="card auth-card">
        <h1>Anmelden</h1>
        <p>Melden Sie sich mit Ihren Zugangsdaten an.</p>
        <form className="form" onSubmit={handleSubmit} noValidate>
          {error ? (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          ) : null}
          <div className="form-field">
            <label className="label" htmlFor="login-email">
              E-Mail
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="login-password">
              Passwort
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
          >
            {submitting ? "Wird angemeldet…" : "Anmelden"}
          </button>
          <p>
            Noch kein Konto? <Link to="/register">Registrieren</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
