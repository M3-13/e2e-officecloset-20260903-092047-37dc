import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import App from "../App.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  );
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
  localStorage.clear();
});

describe("App-Shell", () => {
  it("rendert Navigation, Logo und Footer-Links", () => {
    renderApp();

    expect(
      screen.getByRole("link", { name: "Office Closet" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Anmelden" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Registrieren" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Datenschutz" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Impressum" })).toBeInTheDocument();
  });

  it("zeigt die Startseite auf /", () => {
    renderApp();
    expect(
      screen.getByRole("heading", { name: "Office Closet" }),
    ).toBeInTheDocument();
  });

  it("erreicht die Login-Seite", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getAllByRole("link", { name: "Anmelden" })[0]);
    expect(
      screen.getByRole("heading", { name: "Anmelden" }),
    ).toBeInTheDocument();
  });

  it("erreicht die Registrierungs-Seite", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getAllByRole("link", { name: "Registrieren" })[0]);
    expect(
      screen.getByRole("heading", { name: "Registrieren" }),
    ).toBeInTheDocument();
  });

  it("erreicht Datenschutz und Impressum über den Footer", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("link", { name: "Datenschutz" }));
    expect(
      screen.getByRole("heading", { name: "Datenschutz" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Impressum" }));
    expect(
      screen.getByRole("heading", { name: "Impressum" }),
    ).toBeInTheDocument();
  });

  it("leitet nicht angemeldete Nutzer von geschützten Routen zur Login-Seite", async () => {
    window.history.pushState({}, "", "/wardrobe");
    renderApp();

    expect(
      await screen.findByRole("heading", { name: "Anmelden" }),
    ).toBeInTheDocument();
  });

  it("zeigt geschützte Seiten nach dem Login", async () => {
    localStorage.setItem(
      "office-closet.auth",
      JSON.stringify({ token: "test-token", user: { id: 1, email: "a@b.c" } }),
    );
    window.history.pushState({}, "", "/wardrobe");
    renderApp();

    expect(
      await screen.findByRole("heading", { name: "Garderobe" }),
    ).toBeInTheDocument();
  });
});

describe("AuthContext", () => {
  function Probe() {
    const { user, token, isAuthenticated, login, logout } = useAuth();
    return (
      <div>
        <span data-testid="user">{user ? user.email : "none"}</span>
        <span data-testid="token">{token || "none"}</span>
        <span data-testid="auth">{isAuthenticated ? "yes" : "no"}</span>
        <button
          type="button"
          onClick={() => login("tok", { id: 2, email: "x@y.z" })}
        >
          login
        </button>
        <button type="button" onClick={logout}>
          logout
        </button>
      </div>
    );
  }

  it("persistiert den Login in localStorage und meldet wieder ab", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("auth")).toHaveTextContent("no");

    await user.click(screen.getByText("login"));
    expect(screen.getByTestId("auth")).toHaveTextContent("yes");
    expect(screen.getByTestId("user")).toHaveTextContent("x@y.z");
    expect(
      JSON.parse(localStorage.getItem("office-closet.auth")).token,
    ).toBe("tok");

    await user.click(screen.getByText("logout"));
    expect(screen.getByTestId("auth")).toHaveTextContent("no");
    expect(localStorage.getItem("office-closet.auth")).toBeNull();
  });
});
