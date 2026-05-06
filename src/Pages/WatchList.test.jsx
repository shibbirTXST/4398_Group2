import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, beforeEach, describe, test, expect } from "vitest";
import WatchList from "./WatchList";

const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
    },
    from: vi.fn((tableName) => {
      if (tableName !== "watchlists") {
        throw new Error(`Unexpected table: ${tableName}`);
      }

      return {
        select: (...args) => mockSelect(...args),
        update: (...args) => mockUpdate(...args),
        delete: (...args) => mockDelete(...args),
      };
    }),
  },
}));

function renderWatchList() {
  return render(
    <MemoryRouter>
      <WatchList />
    </MemoryRouter>
  );
}

function mockWatchlistFetch(rows) {
  mockSelect.mockReturnValue({
    eq: mockEq.mockReturnValue({
      order: mockOrder.mockResolvedValue({
        data: rows,
        error: null,
      }),
    }),
  });
}

function mockStatusUpdate(updatedRow = []) {
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({
      error: null,
      data: updatedRow,
    }),
  });
}

function mockRemoveSuccess() {
  mockDelete.mockReturnValue({
    eq: vi.fn().mockResolvedValue({
      error: null,
    }),
  });
}

describe("WatchList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows empty watchlist message and start button when user has no anime saved", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-123", email: "test@example.com" },
      },
      error: null,
    });

    mockWatchlistFetch([]);

    renderWatchList();

    expect(await screen.findByText("Watchlist")).toBeInTheDocument();
    expect(
      await screen.findByText(/watchlist is empty/i)
    ).toBeInTheDocument();

    const startButton = screen.getByRole("button", {
      name: /start adding to watchlist/i,
    });
    expect(startButton).toBeInTheDocument();

    const exploreLink = screen.getByRole("link", {
      name: /start adding to watchlist/i,
    });
    expect(exploreLink).toHaveAttribute("href", "/explore");
  });

  test("renders saved anime from the user's watchlist", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-123", email: "test@example.com" },
      },
      error: null,
    });

    mockWatchlistFetch([
      {
        id: 8,
        user_id: "user-123",
        anime_id: 52991,
        title: "Sousou no Frieren",
        image_url: "https://example.com/frieren.jpg",
        status: "plan_to_watch",
        created_at: "2026-04-10T12:00:00Z",
      },
    ]);

    renderWatchList();

    expect(await screen.findByText("Sousou no Frieren")).toBeInTheDocument();
    expect(screen.getByText("ID: 52991")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /sousou no frieren/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view details/i })
    ).toHaveAttribute("href", "/anime/52991");
  });

  test("updates an anime status when a new category is selected", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-123", email: "test@example.com" },
      },
      error: null,
    });

    mockWatchlistFetch([
      {
        id: 8,
        user_id: "user-123",
        anime_id: 52991,
        title: "Sousou no Frieren",
        image_url: "https://example.com/frieren.jpg",
        status: "plan_to_watch",
        created_at: "2026-04-10T12:00:00Z",
      },
    ]);

    mockStatusUpdate([{ id: 8, status: "watching" }]);

    renderWatchList();

    expect(await screen.findByText("Sousou no Frieren")).toBeInTheDocument();

    const select = screen.getByDisplayValue("Plan to Watch");
    fireEvent.change(select, { target: { value: "watching" } });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: "watching" });
    });
  });

  test("removes an anime from the watchlist when remove button is clicked", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-123", email: "test@example.com" },
      },
      error: null,
    });

    mockWatchlistFetch([
      {
        id: 8,
        user_id: "user-123",
        anime_id: 52991,
        title: "Sousou no Frieren",
        image_url: "https://example.com/frieren.jpg",
        status: "plan_to_watch",
        created_at: "2026-04-10T12:00:00Z",
      },
    ]);

    mockRemoveSuccess();

    renderWatchList();

    expect(await screen.findByText("Sousou no Frieren")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove from watchlist/i }));

    await waitFor(() => {
      expect(screen.queryByText("Sousou no Frieren")).not.toBeInTheDocument();
    });
  });

  test("shows not logged in when there is no authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });

    renderWatchList();

    expect(await screen.findByText("Watchlist")).toBeInTheDocument();
    expect(screen.getByText("Login to See Watchlist")).toBeInTheDocument();
  });
});