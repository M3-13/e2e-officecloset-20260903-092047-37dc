import { useEffect, useMemo, useRef, useState } from "react";
import client, { ApiError } from "../api/client.js";
import "./Wardrobe.css";

const CATEGORIES = ["Oberteil", "Unterteil", "Kleid", "Schuhe", "Accessoire"];

function uploadErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.status === 413) {
      return "Die Bilddatei ist zu groß. Bitte wählen Sie eine kleinere Datei (max. 5 MB).";
    }
    if (err.status === 415) {
      return "Dieses Dateiformat wird nicht unterstützt. Bitte laden Sie ein JPEG-, PNG- oder WebP-Bild hoch.";
    }
  }
  return "Beim Hochladen ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.";
}

export default function Wardrobe() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [activeCategory, setActiveCategory] = useState(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function loadItems() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await client.get("/items");
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError("Die Garderobe konnte nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadItems();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (!activeCategory) {
      return items;
    }
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    if (file) {
      formData.append("image", file);
    }

    setSubmitting(true);
    try {
      const created = await client.post("/items", formData);
      setItems((prev) => [...prev, created]);
      setName("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setFormSuccess("Das Kleidungsstück wurde hinzugefügt.");
    } catch (err) {
      setFormError(uploadErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    setDeleteError(null);
    setDeletingId(item.id);
    try {
      await client.delete(`/items/${item.id}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setDeleteError("Das Kleidungsstück konnte nicht gelöscht werden.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page container">
      <header className="page-hero">
        <h1 className="page-hero__title">Garderobe</h1>
        <p className="page-hero__subtitle">
          Verwalten Sie Ihre Kleidungsstücke — mit Bild, Kategorie und einem
          Klick zum Löschen.
        </p>
      </header>

      <section className="wardrobe-add card">
        <h2>Neues Kleidungsstück anlegen</h2>
        <form className="wardrobe-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="label" htmlFor="item-name">
              Name
            </label>
            <input
              id="item-name"
              className="input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. Schwarzes Abendkleid"
              required
            />
          </div>

          <div className="form-field">
            <label className="label" htmlFor="item-category">
              Kategorie
            </label>
            <select
              id="item-category"
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="label" htmlFor="item-image">
              Bild (optional)
            </label>
            <input
              id="item-image"
              ref={fileInputRef}
              className="input file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>

          {formError && (
            <div className="alert alert--error" role="alert">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="alert alert--success" role="status">
              {formSuccess}
            </div>
          )}

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !name.trim()}
          >
            {submitting ? "Wird gespeichert …" : "Hinzufügen"}
          </button>
        </form>
      </section>

      <section className="wardrobe-list">
        <div className="category-filter" role="group" aria-label="Kategoriefilter">
          <button
            type="button"
            className={`category-badge ${activeCategory === null ? "category-badge--active" : ""}`}
            onClick={() => setActiveCategory(null)}
          >
            Alle
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`category-badge ${activeCategory === c ? "category-badge--active" : ""}`}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {loadError && (
          <div className="alert alert--error" role="alert">
            {loadError}
          </div>
        )}

        {deleteError && (
          <div className="alert alert--error" role="alert">
            {deleteError}
          </div>
        )}

        {loading ? (
          <div className="page-loading">Wird geladen&hellip;</div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state__title">Noch keine Kleidungsstücke</h2>
            <p className="empty-state__description">
              {items.length === 0
                ? "Legen Sie Ihr erstes Kleidungsstück an, um Ihre Garderobe zu füllen."
                : "Keine Kleidungsstücke in dieser Kategorie."}
            </p>
          </div>
        ) : (
          <ul className="wardrobe-grid">
            {filteredItems.map((item) => (
              <li key={item.id} className="item-card">
                {item.image_url ? (
                  <img
                    className="item-card__image"
                    src={item.image_url}
                    alt={item.name}
                  />
                ) : (
                  <div className="item-card__image item-card__image--placeholder">
                    Kein Bild
                  </div>
                )}
                <div className="item-card__body">
                  <h3 className="item-card__name">{item.name}</h3>
                  <span className="item-card__category">{item.category}</span>
                  <button
                    type="button"
                    className="btn btn--danger item-card__delete"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? "Wird gelöscht …" : "Löschen"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
