import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import App from "../App.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import * as clientModule from "../api/client.js";

function renderApp(path = "/account") {
  window.history.pushState({}, "", path);
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  localStorage.setItem(
    "office-closet.auth",
    JSON.stringify({ token: "test-token", user: { id: 1, email: "a@b.c" } }),
  );
});

describe("Account-Seite", () => {
  it("zeigt die E-Mail des angemeldeten Benutzers", async () => {
    renderApp();
    expect(
      await screen.findByRole("heading", { name: "Konto" }),
    ).toBeInTheDocument();
    expect(screen.getByText("a@b.c")).toBeInTheDocument();
  });

  it("zeigt nach Klick auf Löschen einen Bestätigungsdialog", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Konto löschen" }));

    expect(
      screen.getByRole("dialog", { name: "Konto wirklich löschen?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Endgültig löschen" }),
    ).toBeInTheDocument();
  });

  it("bricht die Löschung beim Abbrechen ab", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Konto löschen" }));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(
      screen.queryByRole("dialog", { name: "Konto wirklich löschen?" }),
    ).not.toBeInTheDocument();
  });

  it("ruft DELETE /api/account auf, meldet ab und leitet zur Startseite", async () => {
    const deleteSpy = vi
      .spyOn(clientModule.client, "delete")
      .mockResolvedValue(null);
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Konto löschen" }));
    await user.click(
      screen.getByRole("button", { name: "Endgültig löschen" }),
    );

    expect(deleteSpy).toHaveBeenCalledWith("/account");
    expect(localStorage.getItem("office-closet.auth")).toBeNull();
    expect(
      await screen.findByRole("heading", { name: "Office Closet" }),
    ).toBeInTheDocument();
  });

  it("zeigt eine Fehlermeldung, wenn die Löschung fehlschlägt", async () => {
    vi.spyOn(clientModule.client, "delete").mockRejectedValue(
      new clientModule.ApiError(500, "Serverfehler"),
    );
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Konto löschen" }));
    await user.click(
      screen.getByRole("button", { name: "Endgültig löschen" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Serverfehler");
    expect(localStorage.getItem("office-closet.auth")).not.toBeNull();
  });
});
