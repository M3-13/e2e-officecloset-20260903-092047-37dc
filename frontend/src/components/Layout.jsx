import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_LINKS = [
  { to: "/wardrobe", label: "Garderobe" },
  { to: "/outfit-creator", label: "Outfit-Creator" },
  { to: "/outfits", label: "Outfits" },
  { to: "/account", label: "Konto" },
];

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        isActive ? "nav-link nav-link--active" : "nav-link"
      }
    >
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="logo">
          Office Closet
        </Link>
        <nav className="topbar-nav">
          {isAuthenticated ? (
            <>
              {NAV_LINKS.map((link) => (
                <NavItem key={link.to} {...link} />
              ))}
              <button
                type="button"
                className="btn btn--secondary nav-logout"
                onClick={handleLogout}
              >
                Abmelden
              </button>
            </>
          ) : (
            <>
              <NavItem to="/login" label="Anmelden" />
              <NavItem to="/register" label="Registrieren" />
            </>
          )}
        </nav>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <nav className="footer-nav">
          <Link to="/privacy" className="footer-link">
            Datenschutz
          </Link>
          <Link to="/imprint" className="footer-link">
            Impressum
          </Link>
        </nav>
        <p className="footer-note">
          &copy; {new Date().getFullYear()} Office Closet
        </p>
      </footer>
    </div>
  );
}
