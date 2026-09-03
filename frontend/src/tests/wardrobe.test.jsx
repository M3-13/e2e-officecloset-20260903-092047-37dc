import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import Wardrobe from "../pages/Wardrobe.jsx";

const { ApiError, mockClient } = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(status, detail) {
      super(detail || `Request failed with status ${status}`);
      this.name = "ApiError";
      this.status = status;
      this.detail = detail;
    }
  }
  return {
    ApiError,
    mockClient: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("../api/client.js", () => ({
  ApiError,
  default: mockClient,
}));

const ITEMS = [
  { id: 1, name: "Schwarzes Kleid", category: "Kleid", image_url: "/uploads/kleid.jpg" },
  { id: 2, name: "Weiße Bluse", category: "Oberteil", image_url: null },
  { id: 3, name: "Rote Schuhe", category: "Schuhe", image_url: "/uploads/schuhe.jpg" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.get.mockResolvedValue([]);
  mockClient.delete.mockResolvedValue(null);
});

describe("Wardrobe", () => {
  it("lädt und zeigt Kleidungsstücke mit Bildern an", async () => {
    mockClient.get.mockResolvedValue(ITEMS);
    render(<Wardrobe />);

    expect(await screen.findByText("Schwarzes Kleid")).toBeInTheDocument();
    expect(screen.getByText("Weiße Bluse")).toBeInTheDocument();
    expect(screen.getByText("Rote Schuhe")).toBeInTheDocument();
    expect(mockClient.get).toHaveBeenCalledWith("/items");

    expect(screen.getByAltText("Schwarzes Kleid")).toHaveAttribute(
      "src",
      "/uploads/kleid.jpg",
    );
  });

  it("filtert die Garderobe nach Kategorie", async () => {
    const user = userEvent.setup();
    mockClient.get.mockResolvedValue(ITEMS);
    render(<Wardrobe />);

    await screen.findByText("Schwarzes Kleid");

    await user.click(screen.getByRole("button", { name: "Schuhe" }));

    expect(screen.getByText("Rote Schuhe")).toBeInTheDocument();
    expect(screen.queryByText("Schwarzes Kleid")).not.toBeInTheDocument();
    expect(screen.queryByText("Weiße Bluse")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Alle" }));
    expect(screen.getByText("Schwarzes Kleid")).toBeInTheDocument();
  });

  it("legt ein neues Kleidungsstück an und zeigt es sofort an", async () => {
    const user = userEvent.setup();
    mockClient.get.mockResolvedValue([]);
    mockClient.post.mockResolvedValue({
      id: 10,
      name: "Neues Hemd",
      category: "Oberteil",
      image_url: null,
    });
    render(<Wardrobe />);

    await screen.findByText("Noch keine Kleidungsstücke");

    await user.type(screen.getByLabelText("Name"), "Neues Hemd");
    await user.selectOptions(screen.getByLabelText("Kategorie"), "Oberteil");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(await screen.findByText("Neues Hemd")).toBeInTheDocument();

    expect(mockClient.post).toHaveBeenCalledTimes(1);
    const [path, body] = mockClient.post.mock.calls[0];
    expect(path).toBe("/items");
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("name")).toBe("Neues Hemd");
    expect(body.get("category")).toBe("Oberteil");
  });

  it("löscht ein Kleidungsstück und entfernt es aus der Liste", async () => {
    const user = userEvent.setup();
    mockClient.get.mockResolvedValue(ITEMS);
    render(<Wardrobe />);

    await screen.findByText("Schwarzes Kleid");

    await user.click(screen.getAllByRole("button", { name: "Löschen" })[0]);

    await waitFor(() =>
      expect(screen.queryByText("Schwarzes Kleid")).not.toBeInTheDocument(),
    );
    expect(mockClient.delete).toHaveBeenCalledWith("/items/1");
    expect(screen.getByText("Weiße Bluse")).toBeInTheDocument();
  });

  it("zeigt bei einer zu großen Datei (413) eine verständliche Meldung", async () => {
    const user = userEvent.setup();
    mockClient.get.mockResolvedValue([]);
    mockClient.post.mockRejectedValue(new ApiError(413, "File too large"));
    render(<Wardrobe />);

    await screen.findByText("Noch keine Kleidungsstücke");

    await user.type(screen.getByLabelText("Name"), "Zu groß");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/zu groß/i);
  });

  it("zeigt bei nicht unterstütztem Format (415) eine verständliche Meldung", async () => {
    const user = userEvent.setup();
    mockClient.get.mockResolvedValue([]);
    mockClient.post.mockRejectedValue(new ApiError(415, "Unsupported media type"));
    render(<Wardrobe />);

    await screen.findByText("Noch keine Kleidungsstücke");

    await user.type(screen.getByLabelText("Name"), "Falsches Format");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /nicht unterstützt/i,
    );
  });

  it("zeigt eine leere Garderobe, wenn keine Items existieren", async () => {
    mockClient.get.mockResolvedValue([]);
    render(<Wardrobe />);

    expect(
      await screen.findByText("Noch keine Kleidungsstücke"),
    ).toBeInTheDocument();
  });
});
