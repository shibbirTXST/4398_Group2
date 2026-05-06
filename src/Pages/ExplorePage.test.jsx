import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import ExplorePage from "./ExplorePage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderExplore(initialEntry = "/explore") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/explore" element={<ExplorePage />} />
      </Routes>
    </MemoryRouter>
  );
}

function mockFetchResponse(data, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve({ data }),
  });
}

describe("ExplorePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    window.alert = vi.fn();
  });

  test("Search by genre", async () => {
    fetch.mockResolvedValueOnce(mockFetchResponse([])); // initial top anime fetch
    renderExplore();

    const actionButton = await screen.findByRole("button", { name: "Action" });

    fetch.mockResolvedValueOnce(mockFetchResponse([
      {
        mal_id: 1,
        title: "Naruto",
        type: "TV",
        score: 8.5,
        images: { jpg: { image_url: "url" } },
      },
    ]));

    await userEvent.click(actionButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith(
        "https://api.jikan.moe/v4/anime?genres=1&order_by=score&sort=desc"
      );
    });

    expect(await screen.findByText(/Browsing genres: Action/i)).toBeInTheDocument();
  });

  test("Search by multiple genres", async () => {
    fetch.mockResolvedValueOnce(mockFetchResponse([])); // initial top anime fetch
    renderExplore();

    const actionButton = await screen.findByRole("button", { name: "Action" });
    const comedyButton = await screen.findByRole("button", { name: "Comedy" });

    fetch.mockResolvedValueOnce(mockFetchResponse([])); // after Action
    await userEvent.click(actionButton);

    fetch.mockResolvedValueOnce(mockFetchResponse([])); // after Comedy
    await userEvent.click(comedyButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith(
        "https://api.jikan.moe/v4/anime?genres=1,4&order_by=score&sort=desc"
      );
    });

    expect(
      await screen.findByText(/Browsing genres: Action, Comedy/i)
    ).toBeInTheDocument();
  });

  test("Genre results contain relevant anime", async () => {
    fetch.mockResolvedValueOnce(mockFetchResponse([])); // initial top anime fetch
    renderExplore();

    const actionButton = await screen.findByRole("button", { name: "Action" });

    fetch.mockResolvedValueOnce(mockFetchResponse([
      {
        mal_id: 10,
        title: "Attack on Titan",
        type: "TV",
        score: 9.0,
        images: { jpg: { image_url: "url" } },
      },
    ]));

    await userEvent.click(actionButton);

    expect(await screen.findByText("Attack on Titan")).toBeInTheDocument();
    expect(screen.getByText("★ 9")).toBeInTheDocument();
  });

  test("Clear genre search", async () => {
    fetch.mockResolvedValueOnce(mockFetchResponse([])); // initial top anime fetch
    renderExplore();

    const actionButton = await screen.findByRole("button", { name: "Action" });

    fetch.mockResolvedValueOnce(mockFetchResponse([])); // fetch after selecting Action
    await userEvent.click(actionButton);

    const clearButton = await screen.findByTitle("Clear all genres");

    fetch.mockResolvedValueOnce(mockFetchResponse([
      {
        mal_id: 99,
        title: "Fullmetal Alchemist: Brotherhood",
        type: "TV",
        score: 9.1,
        images: { jpg: { image_url: "url" } },
      },
    ]));

    await userEvent.click(clearButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("https://api.jikan.moe/v4/top/anime");
    });

    expect(await screen.findByText(/Trending anime/i)).toBeInTheDocument();
  });

  test("Invalid/unavailable genre selection", async () => {
    fetch.mockResolvedValueOnce(mockFetchResponse([])); // fetch for invalid genre from URL

    renderExplore("/explore?genres=999");

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "https://api.jikan.moe/v4/anime?genres=999&order_by=score&sort=desc"
      );
    });

    expect(await screen.findByText(/Browsing genres: Unknown Genre/i)).toBeInTheDocument();
  });

  test("Surprise Me button navigates correctly", async () => {
    fetch.mockResolvedValueOnce(mockFetchResponse([])); // initial top anime fetch
    renderExplore();

    const surpriseButton = await screen.findByRole("button", { name: /Surprise Me/i });

    fetch.mockResolvedValueOnce(mockFetchResponse({
      mal_id: 777,
      title: "Steins;Gate",
      images: { jpg: { image_url: "url" } },
    }));

    await userEvent.click(surpriseButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("https://api.jikan.moe/v4/random/anime");
      expect(mockNavigate).toHaveBeenCalledWith("/anime/777");
    });
  });

  test("Surprise Me returns a valid anime each time", async () => {
    fetch.mockResolvedValueOnce(mockFetchResponse([])); // initial top anime fetch
    renderExplore();

    const surpriseButton = await screen.findByRole("button", { name: /Surprise Me/i });

    fetch
      .mockResolvedValueOnce(mockFetchResponse({
        mal_id: 101,
        title: "Cowboy Bebop",
        images: { jpg: { image_url: "url" } },
      }))
      .mockResolvedValueOnce(mockFetchResponse({
        mal_id: 202,
        title: "Monster",
        images: { jpg: { image_url: "url" } },
      }));

    await userEvent.click(surpriseButton);
    await userEvent.click(surpriseButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenNthCalledWith(1, "/anime/101");
      expect(mockNavigate).toHaveBeenNthCalledWith(2, "/anime/202");
    });
  });

  test("Surprise Me handles API failure", async () => {
    fetch.mockResolvedValueOnce(mockFetchResponse([])); // initial top anime fetch
    renderExplore();

    const surpriseButton = await screen.findByRole("button", { name: /Surprise Me/i });

    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    await userEvent.click(surpriseButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to fetch a random anime.");
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});