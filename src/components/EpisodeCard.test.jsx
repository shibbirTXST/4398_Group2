import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import EpisodeCard from "./EpisodeCard";

// Mock supabase
vi.mock("../supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from "../supabaseClient";

const mockEpisode = {
  mal_id: 5,
  title: "Ballad of Fallen Angels",
  aired: "1998-11-07T00:00:00+00:00",
};

function renderEpisodeCard() {
  return render(
    <EpisodeCard
      animeId={1}
      episode={mockEpisode}
      currentUser={{ id: "user-1" }}
    />
  );
}

describe("EpisodeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("loads existing episode rating", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 123,
        rating: 10,
        review_text: "Best episode.",
      },
      error: null,
    });

    const eqThird = vi.fn(() => ({
      maybeSingle,
    }));

    const eqSecond = vi.fn(() => ({
      eq: eqThird,
    }));

    const eqFirst = vi.fn(() => ({
      eq: eqSecond,
    }));

    supabase.from.mockImplementation((table) => {
      if (table === "episode_ratings") {
        return {
          select: vi.fn(() => ({
            eq: eqFirst,
          })),
        };
      }
    });

    renderEpisodeCard();

    expect(
      await screen.findByText("You already rated this episode. You can update it below.")
    ).toBeInTheDocument();
  });

  test("submits a new episode rating and review", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 50,
          rating: 9,
          review_text: "Excellent episode.",
        },
        error: null,
      });

    const eqThird = vi.fn(() => ({
      maybeSingle,
    }));

    const eqSecond = vi.fn(() => ({
      eq: eqThird,
    }));

    const eqFirst = vi.fn(() => ({
      eq: eqSecond,
    }));

    const upsert = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((table) => {
      if (table === "episode_ratings") {
        return {
          select: vi.fn(() => ({
            eq: eqFirst,
          })),
          upsert,
        };
      }
    });

    window.alert = vi.fn();

    renderEpisodeCard();

    fireEvent.click(screen.getByRole("button", { name: /rate episode/i }));

    await userEvent.selectOptions(screen.getByRole("combobox"), "9");

    await userEvent.type(
      screen.getByPlaceholderText("Write your episode review..."),
      "Excellent episode."
    );

    fireEvent.click(
      screen.getByRole("button", { name: /submit episode rating/i })
    );

    await waitFor(() =>
      expect(upsert).toHaveBeenCalledWith(
        {
          user_id: "user-1",
          anime_id: 1,
          episode_id: 5,
          episode_number: 5,
          rating: 9,
          review_text: "Excellent episode.",
        },
        {
          onConflict: "user_id,anime_id,episode_id",
        }
      )
    );

    expect(window.alert).toHaveBeenCalledWith("Episode rating saved!");
  });

  test("shows community episode reviews when toggled", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const eqThirdSingle = vi.fn(() => ({
      maybeSingle,
    }));

    const eqSecondSingle = vi.fn(() => ({
      eq: eqThirdSingle,
    }));

    const eqFirstSingle = vi.fn(() => ({
      eq: eqSecondSingle,
    }));

    const range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          user_id: "user-1",
          rating: 10,
          review_text: "Incredible.",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const order = vi.fn(() => ({
      range,
    }));

    const eqSecondReviews = vi.fn(() => ({
      order,
    }));

    const eqFirstReviews = vi.fn(() => ({
      eq: eqSecondReviews,
    }));

    supabase.from.mockImplementation((table) => {
      if (table === "episode_ratings") {
        return {
          select: vi.fn((fields) => {
            if (fields === "id, rating, review_text") {
              return {
                eq: eqFirstSingle,
              };
            }

            return {
              eq: eqFirstReviews,
            };
          }),
        };
      }
    });

    renderEpisodeCard();

    fireEvent.click(screen.getByRole("button", { name: /show reviews/i }));

    expect(await screen.findByText("Incredible.")).toBeInTheDocument();
    expect(screen.getByText("Your review")).toBeInTheDocument();
  });
});