import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { client } from "../api/client.js";

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  zIndex: 100,
};

const modalDialogStyle = {
  background: "#1A1612",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "24px",
  maxWidth: "480px",
  width: "100%",
  boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
};

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await client.delete("/account");
      logout();
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err && err.detail
          ? err.detail
          : "Das Konto konnte nicht gelöscht werden.",
      );
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="page container">
      <h1>Konto</h1>
      <div className="card">
        <h2>Angemeldet als</h2>
        <p className="account-email">{user ? user.email : ""}</p>

        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn--danger"
          onClick={() => setConfirming(true)}
        >
          Konto löschen
        </button>
      </div>

      {confirming ? (
        <div
          className="modal-overlay"
          style={modalOverlayStyle}
          role="presentation"
          onClick={() => {
            if (!deleting) {
              setConfirming(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            style={modalDialogStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-dialog-title">Konto wirklich löschen?</h2>
            <p>
              Ihr Konto wird inklusive aller Garderobenstücke, Outfits und
              hochgeladener Bilder unwiderruflich gelöscht. Dieser Schritt kann
              nicht rückgängig gemacht werden.
            </p>
            <div className="form" style={{ flexDirection: "row", gap: "12px" }}>
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Wird gelöscht…" : "Endgültig löschen"}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
