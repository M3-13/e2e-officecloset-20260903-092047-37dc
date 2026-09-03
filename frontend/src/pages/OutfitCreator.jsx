import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client.js";

const LAYOUT_CSS = `
  .outfit-creator {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  @media (min-width: 768px) {
    .outfit-creator {
      flex-direction: row;
      align-items: flex-start;
    }
    .outfit-creator__selection {
      flex: 1 1 60%;
    }
    .outfit-creator__preview {
      flex: 0 0 40%;
      position: sticky;
      top: calc(var(--topbar-height) + var(--space-4));
    }
  }

  .outfit-creator h2 {
    color: var(--color-fg);
  }

  .outfit-creator__count {
    color: var(--color-muted);
    font-size: 14px;
  }

  .item-card:focus-visible {
    outline: 2px solid var(--color-fg);
    outline-offset: 2px;
  }
`;

const GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: "var(--space-3)",
};

const CARD_STYLE = {
  position: "relative",
  padding: 0,
  overflow: "hidden",
  textAlign: "left",
  cursor: "pointer",
  background: "linear-gradient(180deg, #1A1612 0%, #14110D 100%)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  color: "var(--color-fg)",
  fontFamily: "var(--font-family)",
  transition: "border-color 160ms ease, transform 160ms ease",
};

const CARD_SELECTED_STYLE = {
  border: "1px solid var(--color-accent)",
  boxShadow: "0 0 0 3px rgba(201, 162, 39, 0.25)",
};

const IMAGE_STYLE = {
  display: "block",
  width: "100%",
  aspectRatio: "4 / 5",
  objectFit: "cover",
  background: "#12100C",
};

const PLACEHOLDER_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  aspectRatio: "4 / 5",
  background: "#12100C",
  color: "var(--color-muted)",
  fontSize: "14px",
};

const CARD_BODY_STYLE = {
  padding: "var(--space-2) var(--space-3)",
};

const CARD_NAME_STYLE = {
  margin: 0,
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-fg)",
};

const CARD_CATEGORY_STYLE = {
  margin: 0,
  fontSize: "13px",
  color: "var(--color-muted)",
};

const CHECK_STYLE = {
  position: "absolute",
  top: "var(--space-2)",
  right: "var(--space-2)",
  width: "24px",
  height: "24px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-accent)",
  color: "var(--color-bg)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: 1,
};

export default function OutfitCreator() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      setLoading(true);
      try {
        const data = await client.get("/items");
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setLoadError(error.detail || error.message);
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

  const selectedIds = useMemo(() => new Set(selected), [selected]);

  function toggleItem(id) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id],
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (selected.length === 0) {
      setSaveError("Bitte wählen Sie mindestens ein Kleidungsstück aus.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaveError("Bitte geben Sie einen Namen für das Outfit ein.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await client.post("/outfits", {
        name: trimmedName,
        item_ids: selected,
      });
      navigate("/outfits");
    } catch (error) {
      setSaveError(error.detail || error.message);
    } finally {
      setSaving(false);
    }
  }

  const previewItems = items.filter((item) => selectedIds.has(item.id));

  return (
    <div className="page container">
      <style>{LAYOUT_CSS}</style>
      <h1>Outfit-Creator</h1>

      <form onSubmit={handleSubmit} className="outfit-creator">
        {loading && <p className="page-loading">Wird geladen&hellip;</p>}

        {!loading && loadError && (
          <div className="alert alert--error" role="alert">
            {loadError}
          </div>
        )}

        {!loading && !loadError && items.length === 0 && (
          <div className="empty-state">
            <h2 className="empty-state__title">Noch keine Kleidungsstücke</h2>
            <p className="empty-state__description">
              Legen Sie zuerst in Ihrer Garderobe Kleidungsstücke an, um ein
              Outfit zusammenzustellen.
            </p>
          </div>
        )}

        {!loading && !loadError && items.length > 0 && (
          <>
            <section className="outfit-creator__selection">
              <h2>Einzelteile auswählen</h2>
              <div style={GRID_STYLE}>
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="item-card"
                      aria-pressed={isSelected}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        ...CARD_STYLE,
                        ...(isSelected ? CARD_SELECTED_STYLE : {}),
                      }}
                    >
                      {isSelected && (
                        <span style={CHECK_STYLE} aria-hidden="true">
                          &#10003;
                        </span>
                      )}
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          style={IMAGE_STYLE}
                        />
                      ) : (
                        <div style={PLACEHOLDER_STYLE} aria-hidden="true">
                          Kein Bild
                        </div>
                      )}
                      <div style={CARD_BODY_STYLE}>
                        <p style={CARD_NAME_STYLE}>{item.name}</p>
                        <p style={CARD_CATEGORY_STYLE}>{item.category}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="outfit-creator__preview">
              <h2>Vorschau</h2>
              <div className="form-field">
                <label className="label" htmlFor="outfit-name">
                  Name
                </label>
                <input
                  id="outfit-name"
                  className="input"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="z. B. Abendgarderobe"
                />
              </div>

              <p className="outfit-creator__count">
                {selected.length}{" "}
                {selected.length === 1
                  ? "Einzelteil ausgewählt"
                  : "Einzelteile ausgewählt"}
              </p>

              <div style={{ ...GRID_STYLE, marginTop: "var(--space-3)" }}>
                {previewItems.map((item) => (
                  <figure
                    key={item.id}
                    style={{ margin: 0 }}
                    className="preview-item"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={IMAGE_STYLE}
                      />
                    ) : (
                      <div style={PLACEHOLDER_STYLE} aria-hidden="true">
                        Kein Bild
                      </div>
                    )}
                    <figcaption
                      style={{
                        padding: "var(--space-1) var(--space-2)",
                        fontSize: "13px",
                        color: "var(--color-muted)",
                      }}
                    >
                      {item.name}
                    </figcaption>
                  </figure>
                ))}
              </div>

              {saveError && (
                <div className="alert alert--error" role="alert">
                  {saveError}
                </div>
              )}

              <button
                type="submit"
                className="btn btn--primary"
                disabled={saving}
                style={{ marginTop: "var(--space-4)" }}
              >
                {saving ? "Wird gespeichert&hellip;" : "Outfit speichern"}
              </button>
            </aside>
          </>
        )}
      </form>
    </div>
  );
}
