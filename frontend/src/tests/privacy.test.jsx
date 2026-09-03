import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import App from "../App.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";

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

describe("Datenschutz & Impressum", () => {
  it("erreicht die Datenschutzerklärung über den Footer-Link", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("link", { name: "Datenschutz" }));

    expect(
      screen.getByRole("heading", { name: "Datenschutz" }),
    ).toBeInTheDocument();
  });

  it("zeigt die Hinweise auf gespeicherte Daten", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("link", { name: "Datenschutz" }));

    expect(screen.getAllByText(/E-Mail-Adresse/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bilder/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Outfits/i).length).toBeGreaterThan(0);
  });

  it("zeigt den Hinweis auf die Kontolöschung", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("link", { name: "Datenschutz" }));

    expect(screen.getByText(/Kontolöschung/i)).toBeInTheDocument();
  });

  it("erreicht das Impressum über den Footer-Link", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("link", { name: "Impressum" }));

    expect(
      screen.getByRole("heading", { name: "Impressum" }),
    ).toBeInTheDocument();
  });

  it("zeigt die Betreiber-Angaben im Impressum", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("link", { name: "Impressum" }));

    expect(screen.getAllByText(/Musterstraße 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Max Mustermann/i).length).toBeGreaterThan(0);
  });
});
