import { useCallback, useEffect, useState } from "react";
import client from "../api/client.js";

const styles = `
  .outfits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--space-3);
  }

  .outfit-card {
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .outfit-card__open {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: 100%;
    padding: 0;
    background: transparent;
    border: none;
    color: inherit;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
  }

  .outfit-card__image {
    aspect-ratio: 4 / 5;
    width: 100%;
    border-radius: var(--radius-md);
    background: #12100c;
    overflow: hidden;
  }

  .outfit-card__image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .outfit-card__image--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-muted);
    font-size: 13px;
  }

  .outfit-card__title {
    color: var(--color-fg);
    font-size: 16px;
    font-weight: var(--heading-weight);
    margin: 0;
  }

  .outfit-card__meta {
    color: var(--color-muted);
    font-size: 13px;
    margin: 0;
  }

  .outfits-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    z-index: 100;
  }

  .outfits-modal {
    background: #1a1612;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    max-width: 480px;
    width: 100%;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
    max-height: 90vh;
    overflow-y: auto;
  }

  .outfit-detail__items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .outfit-detail__item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .outfit-detail__thumb {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    background: #12100c;
  }

  .outfit-detail__name {
    flex: 1;
  }

  .outfit-detail__category {
    color: var(--color-muted);
    font-size: 13px;
  }

  .outfits-modal__actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
    flex-wrap: wrap;
  }
`;

function categoryLabel(category) {
  const labels = {
    Oberteil: "Oberteil",
    Unterteil: "Unterteil",
    Kleid: "Kleid",
    Schuhe: "Schuhe",
    Accessoire: "Accessoire",
  };
  return labels[category] || category;
}

function OutfitCard({ outfit, onOpen, onDelete, deleting }) {
  const cover = (outfit.items || []).find((item) => item.image_url);
  const itemCount = outfit.items?.length ?? outfit.item_ids?.length ?? 0;

  return (
    <article className="card outfit-card">
      <button
        type="button"
        className="outfit-card__open"
        onClick={() => onOpen(outfit)}
        aria-label={`${outfit.name} öffnen`}
      >
        <div className="outfit-card__image">
          {cover ? (
            <img src={cover.image_url} alt={outfit.name} />
          ) : (
            <div className="outfit-card__image--placeholder">Kein Bild</div>
          )}
        </div>
        <h3 className="outfit-card__title">{outfit.name}</h3>
        <p className="outfit-card__meta">
          {itemCount} {itemCount === 1 ? "Teil" : "Teile"}
        </p>
      </button>
      <button
        type="button"
        className="btn btn--danger"
        aria-label={`${outfit.name} löschen`}
        onClick={() => onDelete(outfit)}
        disabled={deleting}
      >
        Löschen
      </button>
    </article>
  );
}

function OutfitDetail({ detail, onClose, onDelete, deleting, error }) {
  const outfit = detail.outfit;

  return (
    <div className="outfits-modal-overlay" onClick={onClose}>
      <div
        className="outfits-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${outfit.name} Details`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="outfit-card__title">{outfit.name}</h2>

        {detail.loading ? (
          <p className="outfit-card__meta">Wird geladen&hellip;</p>
        ) : error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : (
          <ul className="outfit-detail__items">
            {(outfit.items || []).map((item) => (
              <li className="outfit-detail__item" key={item.id}>
                {item.image_url ? (
                  <img
                    className="outfit-detail__thumb"
                    src={item.image_url}
                    alt={item.name}
                  />
                ) : (
                  <div
                    className="outfit-detail__thumb"
                    aria-hidden="true"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>
                      Kein Bild
                    </span>
                  </div>
                )}
                <div className="outfit-detail__name">
                  <div>{item.name}</div>
                  <div className="outfit-detail__category">
                    {categoryLabel(item.category)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="outfits-modal__actions">
          <button
            type="button"
            className="btn btn--danger"
            aria-label={`${outfit.name} löschen`}
            onClick={() => onDelete(outfit)}
            disabled={deleting}
          >
            Löschen
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Outfits() {
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadOutfits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.get("/outfits");
      setOutfits(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.detail || err.message || "Outfits konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOutfits();
  }, [loadOutfits]);

  const openOutfit = useCallback(async (outfit) => {
    setDetail({ outfit, loading: true, error: null });
    try {
      const data = await client.get(`/outfits/${outfit.id}`);
      setDetail({ outfit: data, loading: false, error: null });
    } catch (err) {
      setDetail({
        outfit,
        loading: false,
        error:
          err.detail || err.message || "Outfit konnte nicht geladen werden.",
      });
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetail(null);
  }, []);

  const deleteOutfit = useCallback(async (outfit) => {
    setDeleting(true);
    try {
      await client.delete(`/outfits/${outfit.id}`);
      setOutfits((prev) => prev.filter((o) => o.id !== outfit.id));
      setDetail((prev) => (prev && prev.outfit.id === outfit.id ? null : prev));
      setError(null);
    } catch (err) {
      const message =
        err.detail || err.message || "Outfit konnte nicht gelöscht werden.";
      if (detail && detail.outfit && detail.outfit.id === outfit.id) {
        setDetail((prev) => ({ ...prev, error: message }));
      } else {
        setError(message);
      }
    } finally {
      setDeleting(false);
    }
  }, [detail]);

  return (
    <div className="page container">
      <style>{styles}</style>
      <h1>Outfits</h1>

      {loading ? (
        <div className="page-loading">Wird geladen&hellip;</div>
      ) : error && outfits.length === 0 ? (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      ) : outfits.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-state__title">Noch keine Outfits</h2>
          <p className="empty-state__description">
            Sie haben noch keine Outfits gespeichert.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          )}
          <div className="outfits-grid">
            {outfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onOpen={openOutfit}
                onDelete={deleteOutfit}
                deleting={deleting}
              />
            ))}
          </div>
        </>
      )}

      {detail && (
        <OutfitDetail
          detail={detail}
          onClose={closeDetail}
          onDelete={deleteOutfit}
          deleting={deleting}
          error={detail.error}
        />
      )}
    </div>
  );
}
