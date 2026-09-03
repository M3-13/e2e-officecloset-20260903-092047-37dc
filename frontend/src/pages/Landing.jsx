import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page">
      <section className="container page-hero">
        <h1 className="page-hero__title">Office Closet</h1>
        <p className="page-hero__subtitle">
          Ihr glamouröser Kleiderschrank-Manager im Hollywood-Stil.
        </p>
      </section>
      <section className="container">
        <div className="card">
          <h2>Willkommen</h2>
          <p>
            Verwalten Sie Ihre Garderobe, kombinieren Sie Outfits und treten Sie
            stilsicher auf — wie auf dem roten Teppich.
          </p>
          {isAuthenticated ? (
            <Link to="/wardrobe" className="btn btn--primary">
              Zur Garderobe
            </Link>
          ) : (
            <div className="form" style={{ flexDirection: "row", gap: "12px" }}>
              <Link to="/login" className="btn btn--primary">
                Anmelden
              </Link>
              <Link to="/register" className="btn btn--secondary">
                Registrieren
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
