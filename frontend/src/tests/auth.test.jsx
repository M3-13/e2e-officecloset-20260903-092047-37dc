import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.jsx";
import App from "../App.jsx";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";

function WardrobeProbe() {
  return <div>Wardrobe</div>;
}

function renderPage(initialEntry) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/wardrobe" element={<WardrobeProbe />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Login", () => {
  it("meldet einen Benutzer mit korrekten Zugangsdaten an und leitet zur Garderobe", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { access_token: "abc.def.ghi", token_type: "bearer" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage("/login");

    await user.type(screen.getByLabelText(/E-Mail/i), "a@b.c");
    await user.type(screen.getByLabelText(/Passwort/i), "secret");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() => {
      expect(screen.getByText("Wardrobe")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("zeigt eine Fehlermeldung bei falschen Zugangsdaten", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { detail: "Invalid credentials" }));
    vi.stubGlobal("fetch", fetchMock);

    renderPage("/login");

    await user.type(screen.getByLabelText(/E-Mail/i), "a@b.c");
    await user.type(screen.getByLabelText(/Passwort/i), "wrong");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(
      await screen.findByText("E-Mail oder Passwort ist falsch."),
    ).toBeInTheDocument();
  });
});

describe("Register", () => {
  it("registriert einen neuen Benutzer und leitet zur Garderobe", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, { id: 1, email: "neu@b.c" }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          access_token: "abc.def.ghi",
          token_type: "bearer",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderPage("/register");

    await user.type(screen.getByLabelText(/E-Mail/i), "neu@b.c");
    await user.type(screen.getByLabelText(/Passwort/i), "secret");
    await user.click(screen.getByRole("button", { name: "Registrieren" }));

    await waitFor(() => {
      expect(screen.getByText("Wardrobe")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("zeigt eine Fehlermeldung bei bereits registrierter E-Mail", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(409, { detail: "E-Mail bereits registriert" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderPage("/register");

    await user.type(screen.getByLabelText(/E-Mail/i), "dup@b.c");
    await user.type(screen.getByLabelText(/Passwort/i), "secret");
    await user.click(screen.getByRole("button", { name: "Registrieren" }));

    expect(
      await screen.findByText("Diese E-Mail-Adresse ist bereits registriert."),
    ).toBeInTheDocument();
  });
});

describe("Geschützte Routen", () => {
  it("leitet nicht angemeldete Nutzer auf die Landing-Seite um", async () => {
    window.history.pushState({}, "", "/wardrobe");
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Office Closet" }),
    ).toBeInTheDocument();
  });
});
