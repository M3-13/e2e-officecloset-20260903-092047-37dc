import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { client } from "../api/client.js";

function errorMessage(error) {
  if (error && error.status === 409) {
    return "Diese E-Mail-Adresse ist bereits registriert.";
  }
  if (error && error.status === 429) {
    return "Zu viele Registrierungsversuche. Bitte versuchen Sie es in 15 Minuten erneut.";
  }
  if (error && error.detail) {
    return error.detail;
  }
  return "Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.";
}

export default function Register() {
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
      const user = await client.post("/auth/register", { email, password });
      const data = await client.post("/auth/login", { email, password });
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
        <h1>Registrieren</h1>
        <p>Erstellen Sie ein Konto für Ihre Garderobe.</p>
        <form className="form" onSubmit={handleSubmit} noValidate>
          {error ? (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          ) : null}
          <div className="form-field">
            <label className="label" htmlFor="register-email">
              E-Mail
            </label>
            <input
              id="register-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="register-password">
              Passwort
            </label>
            <input
              id="register-password"
              className="input"
              type="password"
              autoComplete="new-password"
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
            {submitting ? "Wird registriert…" : "Registrieren"}
          </button>
          <p>
            Bereits ein Konto? <Link to="/login">Anmelden</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
