import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OutfitCreator from "../pages/OutfitCreator.jsx";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("../api/client.js", () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
  },
}));

const ITEMS = [
  {
    id: 1,
    name: "Rotes Kleid",
    category: "Kleid",
    image_url: "/uploads/kleid.jpg",
  },
  {
    id: 2,
    name: "Schwarze Schuhe",
    category: "Schuhe",
    image_url: null,
  },
  {
    id: 3,
    name: "Goldene Kette",
    category: "Accessoire",
    image_url: "/uploads/kette.jpg",
  },
];

function renderCreator() {
  return render(
    <MemoryRouter initialEntries={["/outfit-creator"]}>
      <Routes>
        <Route path="/outfit-creator" element={<OutfitCreator />} />
        <Route
          path="/outfits"
          element={<div>Outfit-Übersicht erreicht</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue(ITEMS);
  mockPost.mockResolvedValue({ id: 10, name: "Test", item_ids: [1, 2] });
});

describe("OutfitCreator", () => {
  it("lädt und zeigt Items als auswählbare Karten", async () => {
    renderCreator();

    expect(await screen.findByText("Rotes Kleid")).toBeInTheDocument();
    expect(screen.getByText("Schwarze Schuhe")).toBeInTheDocument();
    expect(screen.getByText("Goldene Kette")).toBeInTheDocument();

    const cards = screen.getAllByRole("button", { name: /Kleid|Schuhe|Kette/ });
    expect(cards.length).toBe(3);
  });

  it("wählt mehrere Items per Klick aus und wieder ab", async () => {
    const user = userEvent.setup();
    renderCreator();

    const dress = await screen.findByRole("button", { name: /Rotes Kleid/ });
    const shoes = screen.getByRole("button", { name: /Schwarze Schuhe/ });

    await user.click(dress);
    expect(dress).toHaveAttribute("aria-pressed", "true");

    await user.click(shoes);
    expect(shoes).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/2 Einzelteile ausgewählt/)).toBeInTheDocument();

    await user.click(dress);
    expect(dress).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/1 Einzelteil ausgewählt/)).toBeInTheDocument();
  });

  it("speichert das Outfit und leitet zur Übersicht weiter", async () => {
    const user = userEvent.setup();
    renderCreator();

    const dress = await screen.findByRole("button", { name: /Rotes Kleid/ });
    await user.click(dress);

    await user.type(screen.getByLabelText("Name"), "Abendgarderobe");
    await user.click(
      screen.getByRole("button", { name: "Outfit speichern" }),
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/outfits", {
        name: "Abendgarderobe",
        item_ids: [1],
      });
    });

    expect(
      await screen.findByText("Outfit-Übersicht erreicht"),
    ).toBeInTheDocument();
  });

  it("zeigt einen Fehler bei 422", async () => {
    mockPost.mockRejectedValue({
      status: 422,
      detail: "Ungültige Auswahl",
    });

    const user = userEvent.setup();
    renderCreator();

    const dress = await screen.findByRole("button", { name: /Rotes Kleid/ });
    await user.click(dress);
    await user.type(screen.getByLabelText("Name"), "Test");
    await user.click(
      screen.getByRole("button", { name: "Outfit speichern" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ungültige Auswahl",
    );
  });

  it("verlangt mindestens ein ausgewähltes Item", async () => {
    const user = userEvent.setup();
    renderCreator();

    await screen.findByText("Rotes Kleid");
    await user.type(screen.getByLabelText("Name"), "Ohne Auswahl");
    await user.click(
      screen.getByRole("button", { name: "Outfit speichern" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "mindestens ein Kleidungsstück",
    );
    expect(mockPost).not.toHaveBeenCalled();
  });
});
