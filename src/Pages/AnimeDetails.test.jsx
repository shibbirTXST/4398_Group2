import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import AnimeDetails from "./AnimeDetails";

// Mock supabase
vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { supabase } from "../supabaseClient";

const mockAnimeResponse = {
  data: {
    mal_id: 1,
    title: "Cowboy Bebop",
    synopsis: "A space western anime.",
    score: 8.7,
    episodes: 26,
    status: "Finished Airing",
    rating: "R - 17+",
    images: {
      jpg: {
        image_url: "https://example.com/bebop.jpg",
      },
    },
  },
};

function renderAnimeDetails() {
  return render(
    <MemoryRouter initialEntries={["/anime/1"]}>
      <Routes>
        <Route path="/anime/:id" element={<AnimeDetails />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AnimeDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAnimeResponse,
    });
  });

  test("loads anime details", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const eqSecond = vi.fn(() => ({
      maybeSingle,
    }));

    const eqFirst = vi.fn(() => ({
      eq: eqSecond,
    }));

    supabase.from.mockImplementation((table) => {
      if (table === "anime_ratings") {
        return {
          select: vi.fn(() => ({
            eq: eqFirst,
          })),
        };
      }
      if (table === "watchlists") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              }))
            }))
          }))
        };
      }
    });

    renderAnimeDetails();

    expect(await screen.findByText("Cowboy Bebop")).toBeInTheDocument();
    expect(screen.getByText("A space western anime.")).toBeInTheDocument();
    expect(screen.getByText(/Finished Airing/)).toBeInTheDocument();
  });

  test("loads existing user rating and review", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 10,
        rating: 9,
        review_text: "Amazing anime.",
      },
      error: null,
    });

    const eqSecond = vi.fn(() => ({
      maybeSingle,
    }));

    const eqFirst = vi.fn(() => ({
      eq: eqSecond,
    }));

    supabase.from.mockImplementation((table) => {
      if (table === "anime_ratings") {
        return {
          select: vi.fn(() => ({
            eq: eqFirst,
          })),
        };
      }
      if (table === "watchlists") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              }))
            }))
          }))
        };
      }
    });

    renderAnimeDetails();

    expect(await screen.findByText("Cowboy Bebop")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("9")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Amazing anime.")).toBeInTheDocument();
    expect(
      screen.getByText("You already rated this anime. You can update it below.")
    ).toBeInTheDocument();
  });

  test("submits a new anime rating and review", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 99,
          rating: 8,
          review_text: "Great show.",
        },
        error: null,
      });

    const eqSecond = vi.fn(() => ({
      maybeSingle,
    }));

    const eqFirst = vi.fn(() => ({
      eq: eqSecond,
    }));

    const upsert = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((table) => {
      if (table === "anime_ratings") {
        return {
          select: vi.fn(() => ({
            eq: eqFirst,
          })),
          upsert,
        };
      }
      if (table === "watchlists") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              }))
            }))
          }))
        };
      }
    });

    window.alert = vi.fn();

    renderAnimeDetails();

    expect(await screen.findByText("Cowboy Bebop")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "8" },
    });

    await userEvent.clear(screen.getByPlaceholderText("Write your review..."));
    await userEvent.type(
      screen.getByPlaceholderText("Write your review..."),
      "Great show."
    );

    fireEvent.click(screen.getByRole("button", { name: /submit rating/i }));

    await waitFor(() =>
      expect(upsert).toHaveBeenCalledWith(
        {
          user_id: "user-1",
          anime_id: 1,
          rating: 8,
          review_text: "Great show.",
        },
        {
          onConflict: "user_id,anime_id",
        }
      )
    );

    expect(window.alert).toHaveBeenCalledWith("Rating saved!");
  });

  test("updates an existing anime rating", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: 10,
          rating: 6,
          review_text: "It was okay.",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 10,
          rating: 10,
          review_text: "Actually, I loved it.",
        },
        error: null,
      });

    const eqSecond = vi.fn(() => ({
      maybeSingle,
    }));

    const eqFirst = vi.fn(() => ({
      eq: eqSecond,
    }));

    const upsert = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((table) => {
      if (table === "anime_ratings") {
        return {
          select: vi.fn(() => ({
            eq: eqFirst,
          })),
          upsert,
        };
      }
      if (table === "watchlists") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              }))
            }))
          }))
        };
      }
    });

    window.alert = vi.fn();

    renderAnimeDetails();

    expect(await screen.findByText("Cowboy Bebop")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "10" },
    });

    const textarea = screen.getByPlaceholderText("Write your review...");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Actually, I loved it.");

    fireEvent.click(screen.getByRole("button", { name: /update rating/i }));

    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(window.alert).toHaveBeenCalledWith("Rating updated!");
  });

  test("shows community reviews when toggled", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const animeEqSecond = vi.fn(() => ({
      maybeSingle,
    }));

    const animeEqFirst = vi.fn(() => ({
      eq: animeEqSecond,
    }));

    const range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          user_id: "user-1",
          rating: 9,
          review_text: "Fantastic.",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          user_id: "user-2",
          rating: 7,
          review_text: "Pretty good.",
          created_at: "2024-01-02T00:00:00Z",
        },
      ],
      error: null,
    });

    const order = vi.fn(() => ({
      range,
    }));

    const eqForReviews = vi.fn(() => ({
      order,
    }));

    supabase.from.mockImplementation((table) => {
      if (table === "anime_ratings") {
        return {
          select: vi.fn((fields) => {
            if (fields === "id, rating, review_text") {
              return {
                eq: animeEqFirst,
              };
            }

            return {
              eq: eqForReviews,
            };
          }),
        };
      }
      if (table === "watchlists") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              }))
            }))
          }))
        };
      }
    });

    renderAnimeDetails();

    expect(await screen.findByText("Cowboy Bebop")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show reviews/i }));

    expect(await screen.findByText("Fantastic.")).toBeInTheDocument();
    expect(screen.getByText("Pretty good.")).toBeInTheDocument();
    expect(screen.getByText("Your review")).toBeInTheDocument();
  });
});