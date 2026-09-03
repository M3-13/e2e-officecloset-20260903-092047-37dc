import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Outfits from "../pages/Outfits.jsx";
import client from "../api/client.js";

vi.mock("../api/client.js", () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

const sampleOutfits = [
  {
    id: 1,
    name: "Abendgarderobe",
    item_ids: [1, 2],
    items: [
      {
        id: 1,
        name: "Seidenbluse",
        category: "Oberteil",
        image_url: "/uploads/a.jpg",
      },
      { id: 2, name: "Bleistiftrock", category: "Unterteil", image_url: null },
    ],
  },
  {
    id: 2,
    name: "Büro",
    item_ids: [3],
    items: [{ id: 3, name: "Kleid", category: "Kleid", image_url: null }],
  },
];

beforeEach(() => {
  client.get.mockReset();
  client.delete.mockReset();
});

describe("Outfits", () => {
  it("lädt und listet gespeicherte Outfits", async () => {
    client.get.mockResolvedValueOnce(sampleOutfits);

    render(<Outfits />);

    expect(
      await screen.findByRole("heading", { name: "Outfits" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Abendgarderobe")).toBeInTheDocument();
    expect(screen.getByText("Büro")).toBeInTheDocument();
    expect(client.get).toHaveBeenCalledWith("/outfits");
  });

  it("zeigt einen leeren Zustand ohne gespeicherte Outfits", async () => {
    client.get.mockResolvedValueOnce([]);

    render(<Outfits />);

    expect(await screen.findByText("Noch keine Outfits")).toBeInTheDocument();
  });

  it("zeigt eine Fehlermeldung, wenn das Laden fehlschlägt", async () => {
    client.get.mockRejectedValueOnce({
      detail: "Outfits konnten nicht geladen werden.",
    });

    render(<Outfits />);

    expect(
      await screen.findByText("Outfits konnten nicht geladen werden."),
    ).toBeInTheDocument();
  });

  it("öffnet die Detailansicht eines Outfits", async () => {
    const user = userEvent.setup();
    client.get.mockImplementation((path) => {
      if (path === "/outfits") {
        return Promise.resolve(sampleOutfits);
      }
      if (path === "/outfits/1") {
        return Promise.resolve(sampleOutfits[0]);
      }
      return Promise.reject(new Error("unexpected path"));
    });

    render(<Outfits />);

    await user.click(
      await screen.findByRole("button", {
        name: "Abendgarderobe öffnen",
      }),
    );

    expect(client.get).toHaveBeenCalledWith("/outfits/1");
    expect(
      await screen.findByRole("dialog", { name: "Abendgarderobe Details" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Seidenbluse")).toBeInTheDocument();
    expect(screen.getByText("Bleistiftrock")).toBeInTheDocument();
  });

  it("löscht ein Outfit und entfernt es aus der Liste", async () => {
    const user = userEvent.setup();
    client.get.mockResolvedValueOnce(sampleOutfits);
    client.delete.mockResolvedValueOnce(null);

    render(<Outfits />);

    await user.click(
      await screen.findByRole("button", {
        name: "Abendgarderobe löschen",
      }),
    );

    await waitFor(() =>
      expect(screen.queryByText("Abendgarderobe")).not.toBeInTheDocument(),
    );
    expect(client.delete).toHaveBeenCalledWith("/outfits/1");
    expect(screen.getByText("Büro")).toBeInTheDocument();
  });

  it("löscht ein Outfit aus der Detailansicht", async () => {
    const user = userEvent.setup();
    client.get.mockImplementation((path) => {
      if (path === "/outfits") {
        return Promise.resolve(sampleOutfits);
      }
      if (path === "/outfits/1") {
        return Promise.resolve(sampleOutfits[0]);
      }
      return Promise.reject(new Error("unexpected path"));
    });
    client.delete.mockResolvedValueOnce(null);

    render(<Outfits />);

    await user.click(
      await screen.findByRole("button", {
        name: "Abendgarderobe öffnen",
      }),
    );
    await screen.findByRole("dialog", { name: "Abendgarderobe Details" });

    const deleteButtons = screen.getAllByRole("button", {
      name: "Abendgarderobe löschen",
    });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() =>
      expect(screen.queryByText("Abendgarderobe")).not.toBeInTheDocument(),
    );
    expect(client.delete).toHaveBeenCalledWith("/outfits/1");
  });
});
