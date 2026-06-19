import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";

const mockSupabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}));

const mockOnboardingService = vi.hoisted(() => ({
  getForYouSignalSummary: vi.fn(),
  saveGenrePreferences: vi.fn(),
  saveOnboardingResponse: vi.fn(),
  getOnboardingCandidates: vi.fn(),
  resetOnboardingData: vi.fn(),
}));

const mockRecommendationService = vi.hoisted(() => ({
  getRecommendations: vi.fn(),
}));

vi.mock("../supabaseClient", () => ({
  supabase: mockSupabase,
}));

vi.mock("../services/onboardingService", () => ({
  getForYouSignalSummary: mockOnboardingService.getForYouSignalSummary,
  saveGenrePreferences: mockOnboardingService.saveGenrePreferences,
  saveOnboardingResponse: mockOnboardingService.saveOnboardingResponse,
  getOnboardingCandidates: mockOnboardingService.getOnboardingCandidates,
  resetOnboardingData: mockOnboardingService.resetOnboardingData,
}));

vi.mock("../services/recommendationService", () => ({
  getRecommendations: mockRecommendationService.getRecommendations,
}));

import ForYouPage from "./ForYouPage";

function renderForYou(initialEntry = "/foryou") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/foryou" element={<ForYouPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function makeSummary(overrides = {}) {
  return {
    totalSignals: 25,
    hasEnoughData: true,
    minimumSignals: 20,
    profileFavorites: [],
    counts: {
      profileFavorites: 0,
      animeRatings: 10,
      interactions: 5,
      genrePreferences: 5,
      onboardingResponses: 5,
    },
    ...overrides,
  };
}

function makeRecommendation(overrides = {}) {
  return {
    mal_id: 1,
    title: "Fullmetal Alchemist: Brotherhood",
    title_english: "Fullmetal Alchemist: Brotherhood",
    synopsis: "Two brothers search for the Philosopher's Stone.",
    image_url: "https://example.com/fmab.jpg",
    type: "TV",
    score: 9.1,
    popularity: 1,
    members: 3000000,
    year: 2009,
    season: "spring",
    genres: ["Action", "Adventure"],
    explanation: ["Matches genres from your favorites: Action, Adventure."],
    ...overrides,
  };
}

function makeReactionCandidate(overrides = {}) {
  return {
    mal_id: 101,
    title: "Toradora!",
    title_english: "Toradora!",
    synopsis: "A rom-com recommendation seed.",
    image_url: "https://example.com/toradora.jpg",
    type: "TV",
    score: 8.1,
    members: 500000,
    genres: ["Romance", "Comedy"],
    ...overrides,
  };
}

function makeAnimeCacheQueryResult(data, error = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => Promise.resolve({ data, error })),
    not: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data, error })),
  };
  return chain;
}

describe("ForYouPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: "user-1" },
      },
      error: null,
    });

    mockSupabase.from.mockImplementation(() =>
      makeAnimeCacheQueryResult([], null)
    );

    mockOnboardingService.getForYouSignalSummary.mockResolvedValue(
      makeSummary()
    );

    mockOnboardingService.saveGenrePreferences.mockResolvedValue([]);
    mockOnboardingService.saveOnboardingResponse.mockResolvedValue([]);
    mockOnboardingService.getOnboardingCandidates.mockResolvedValue([]);
    mockOnboardingService.resetOnboardingData.mockResolvedValue(true);

    mockRecommendationService.getRecommendations.mockResolvedValue({
      recommendations: [makeRecommendation()],
      hasEnoughData: true,
      mode: "personalized",
    });
  });

  test("Recommendations appear after user has rated enough anime", async () => {
    renderForYou();

    expect(
      await screen.findByText("Fullmetal Alchemist: Brotherhood")
    ).toBeInTheDocument();
    expect(screen.getByText(/Score: 9.1/i)).toBeInTheDocument();
  });

  test("Recommendation results contain valid anime entries", async () => {
    renderForYou();

    expect(
      await screen.findByText("Fullmetal Alchemist: Brotherhood")
    ).toBeInTheDocument();
    expect(screen.getByText(/Genres: Action, Adventure/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Two brothers search for the Philosopher's Stone/i)
    ).toBeInTheDocument();
  });

  test("Select anime from recommendation results", async () => {
    renderForYou();

    const links = await screen.findAllByRole("link", {
      name: /Fullmetal Alchemist: Brotherhood/i,
    });

    expect(links[0]).toHaveAttribute("href", "/anime/1");
    expect(links[1]).toHaveAttribute("href", "/anime/1");
  });

  test("Recommendation section handles insufficient user rating history", async () => {
    mockOnboardingService.getForYouSignalSummary.mockResolvedValue(
      makeSummary({
        totalSignals: 5,
        hasEnoughData: false,
      })
    );

    renderForYou();

    expect(
      await screen.findByRole("heading", {
        name: /personalize your recommendations/i,
      })
    ).toBeInTheDocument();
  });

  test("Onboarding appears for user with insufficient rating history", async () => {
    mockOnboardingService.getForYouSignalSummary.mockResolvedValue(
      makeSummary({
        totalSignals: 3,
        hasEnoughData: false,
      })
    );

    renderForYou();

    expect(
      await screen.findByText(/Ready to continue\?/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Continue/i })
    ).toBeInTheDocument();
  });

  test("User can skip onboarding and still receive fallback recommendations", async () => {
    const user = userEvent.setup();

    mockOnboardingService.getForYouSignalSummary.mockResolvedValue(
      makeSummary({
        totalSignals: 2,
        hasEnoughData: false,
      })
    );

    mockRecommendationService.getRecommendations.mockResolvedValue({
      recommendations: [
        makeRecommendation({
          mal_id: 777,
          title: "Cowboy Bebop",
          title_english: "Cowboy Bebop",
          genres: ["Action", "Sci-Fi"],
          explanation: ["Popular anime while we learn your preferences."],
        }),
      ],
      hasEnoughData: false,
      mode: "fallback",
    });

    renderForYou();

    await user.click(
      await screen.findByRole("button", { name: /Skip for now/i })
    );

    expect(await screen.findByText("Cowboy Bebop")).toBeInTheDocument();
    expect(
      screen.getByText(/Showing popular anime while we learn your preferences/i)
    ).toBeInTheDocument();
  });

  test("User can select liked/disliked genres", async () => {
    const user = userEvent.setup();

    mockOnboardingService.getForYouSignalSummary.mockResolvedValue(
      makeSummary({
        totalSignals: 3,
        hasEnoughData: false,
      })
    );

    mockOnboardingService.getOnboardingCandidates.mockResolvedValue([
      makeReactionCandidate(),
    ]);

    renderForYou();

    await user.click(
      await screen.findByRole("button", { name: /^Continue$/i })
    );

    const actionButtons = await screen.findAllByRole("button", { name: "Action" });
    const horrorButtons = await screen.findAllByRole("button", { name: "Horror" });

    await user.click(actionButtons[0]); // liked Action
    await user.click(horrorButtons[1]); // disliked Horror
    await user.click(
      await screen.findByRole("button", { name: /Save and Continue/i })
    );

    await waitFor(() => {
      expect(mockOnboardingService.saveGenrePreferences).toHaveBeenCalledWith(
        "user-1",
        expect.arrayContaining(["Action"]),
        expect.arrayContaining(["Horror"])
      );
    });

    expect(await screen.findByText(/Quick picks/i)).toBeInTheDocument();
  });

  test.each([
    ["I’d like this", "like"],
    ["Not sure", "unsure"],
    ["Not for me", "dislike"],
  ])(
    "User can respond to anime training cards (%s)",
    async (buttonLabel, expectedResponse) => {
      const user = userEvent.setup();

      mockOnboardingService.getForYouSignalSummary.mockResolvedValue(
        makeSummary({
          totalSignals: 4,
          hasEnoughData: false,
        })
      );

      mockOnboardingService.getOnboardingCandidates.mockResolvedValue([
        makeReactionCandidate({
          mal_id: 222,
          title: "Toradora!",
        }),
      ]);

      renderForYou();

      await user.click(
        await screen.findByRole("button", { name: /^Continue$/i })
      );
      await user.click(
        await screen.findByRole("button", { name: /Save and Continue/i })
      );

      await user.click(
        await screen.findByRole("button", { name: buttonLabel })
      );

      await waitFor(() => {
        expect(mockOnboardingService.saveOnboardingResponse).toHaveBeenCalledWith(
          "user-1",
          expect.objectContaining({ mal_id: 222 }),
          expectedResponse
        );
      });
    }
  );

  test("Starter recommendations are generated after onboarding input", async () => {
    const user = userEvent.setup();

    mockOnboardingService.getForYouSignalSummary
      .mockResolvedValueOnce(
        makeSummary({
          totalSignals: 4,
          hasEnoughData: false,
        })
      )
      .mockResolvedValueOnce(
        makeSummary({
          totalSignals: 10,
          hasEnoughData: false,
        })
      )
      .mockResolvedValueOnce(
        makeSummary({
          totalSignals: 15,
          hasEnoughData: false,
        })
      );

    mockOnboardingService.getOnboardingCandidates.mockResolvedValue([
      makeReactionCandidate({
        mal_id: 333,
        title: "Kaguya-sama: Love is War",
        genres: ["Romance", "Comedy"],
      }),
    ]);

    mockRecommendationService.getRecommendations.mockResolvedValue({
      recommendations: [
        makeRecommendation({
          mal_id: 444,
          title: "Toradora!",
          title_english: "Toradora!",
          genres: ["Romance", "Comedy"],
          explanation: ["Includes genres you said you like: Romance."],
        }),
      ],
      hasEnoughData: true,
      mode: "personalized",
    });

    renderForYou();

    await user.click(
      await screen.findByRole("button", { name: /^Continue$/i })
    );
    const romanceButtons = await screen.findAllByRole("button", { name: "Romance" });
    await user.click(romanceButtons[0]);
    await user.click(
      await screen.findByRole("button", { name: /Save and Continue/i })
    );

    await user.click(await screen.findByRole("button", { name: "I’d like this" }));
    await user.click(
      await screen.findByRole("button", {
        name: /Continue with Current Preferences|Get My Recommendations/i,
      })
    );

    expect(await screen.findByText("Toradora!")).toBeInTheDocument();
  });

  test("Recommendations reflect onboarding selections", async () => {
    const user = userEvent.setup();

    mockOnboardingService.getForYouSignalSummary
      .mockResolvedValueOnce(
        makeSummary({
          totalSignals: 4,
          hasEnoughData: false,
        })
      )
      .mockResolvedValueOnce(
        makeSummary({
          totalSignals: 9,
          hasEnoughData: false,
        })
      );

    mockOnboardingService.getOnboardingCandidates.mockResolvedValue([
      makeReactionCandidate({
        mal_id: 555,
        title: "My Dress-Up Darling",
        genres: ["Romance", "Comedy"],
      }),
    ]);

    mockRecommendationService.getRecommendations.mockResolvedValue({
      recommendations: [
        makeRecommendation({
          mal_id: 556,
          title: "Horimiya",
          title_english: "Horimiya",
          genres: ["Romance", "Slice of Life"],
          explanation: [
            "Similar to anime you reacted positively to through: Romance.",
          ],
        }),
      ],
      hasEnoughData: true,
      mode: "personalized",
    });

    renderForYou();

    await user.click(
      await screen.findByRole("button", { name: /^Continue$/i })
    );
      const romanceButtons = await screen.findAllByRole("button", { name: "Romance" });
      await user.click(romanceButtons[0]);    await user.click(
      await screen.findByRole("button", { name: /Save and Continue/i })
    );
    await user.click(await screen.findByRole("button", { name: "I’d like this" }));
    await user.click(
      await screen.findByRole("button", {
        name: /Continue with Current Preferences|Get My Recommendations/i,
      })
    );

    expect(await screen.findByText("Horimiya")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Why This\?/i }));
    expect(
      await screen.findByText(/Similar to anime you reacted positively to/i)
    ).toBeInTheDocument();
  });
});

describe("recommendationService and related helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: "user-1" },
      },
      error: null,
    });
  });

  test("Recommendations are based on previously disliked anime", async () => {
    const { scoreCandidates } = await vi.importActual(
      "../services/recommendationService"
    );

    const candidates = [
      makeRecommendation({
        mal_id: 20,
        title: "Horror Candidate",
        genres: ["Horror"],
      }),
      makeRecommendation({
        mal_id: 21,
        title: "Adventure Candidate",
        genres: ["Adventure"],
      }),
    ];

    const inputs = {
      profileFavorites: [],
      likedOnboardingAnime: [],
      dislikedOnboardingAnime: [
        {
          mal_id: 901,
          title: "Disliked Horror Show",
          genres: ["Horror"],
        },
      ],
      likedGenres: [],
      dislikedGenres: ["Horror"],
    };

    const scored = scoreCandidates(candidates, inputs);

    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0].title).toBe("Adventure Candidate");

    const horrorEntry = scored.find((item) => item.title === "Horror Candidate");
    const adventureEntry = scored.find((item) => item.title === "Adventure Candidate");

    expect(adventureEntry).toBeTruthy();

    if (horrorEntry) {
      expect(adventureEntry.recommendationScore).toBeGreaterThan(
        horrorEntry.recommendationScore
      );
    }
  });

  test("Recommendations exclude already rated anime", async () => {
    const { buildExcludedIds } = await vi.importActual(
      "../services/recommendationService"
    );

    const excluded = buildExcludedIds({
      profileFavorites: [{ mal_id: 1, title: "Favorite" }],
      animeRatings: [{ anime_id: 2, rating: 9 }],
      interactions: [{ mal_id: 3, liked: true }],
      onboardingResponses: [{ mal_id: 4, response: "dislike" }],
    });

    expect(excluded.has(1)).toBe(true);
    expect(excluded.has(2)).toBe(true);
    expect(excluded.has(3)).toBe(true);
    expect(excluded.has(4)).toBe(true);
  });

  test("Recommendations update after user changes a rating", async () => {
    const { scoreCandidates } = await vi.importActual(
      "../services/recommendationService"
    );

    const candidates = [
      makeRecommendation({
        mal_id: 30,
        title: "Action Show",
        genres: ["Action"],
      }),
      makeRecommendation({
        mal_id: 31,
        title: "Romance Show",
        genres: ["Romance"],
      }),
    ];

    const actionInputs = {
      profileFavorites: [{ mal_id: 800, title: "Action Fav", genres: ["Action"] }],
      likedOnboardingAnime: [],
      dislikedOnboardingAnime: [],
      likedGenres: [],
      dislikedGenres: [],
    };

    const romanceInputs = {
      profileFavorites: [{ mal_id: 801, title: "Romance Fav", genres: ["Romance"] }],
      likedOnboardingAnime: [],
      dislikedOnboardingAnime: [],
      likedGenres: [],
      dislikedGenres: [],
    };

    const actionRanked = scoreCandidates(candidates, actionInputs);
    const romanceRanked = scoreCandidates(candidates, romanceInputs);

    expect(actionRanked[0].title).toBe("Action Show");
    expect(romanceRanked[0].title).toBe("Romance Show");
  });

  test("Recommendation results do not contain duplicates", async () => {
    const { dedupeScoredByFranchise } = await vi.importActual(
      "../services/dedupingService"
    );

    const deduped = dedupeScoredByFranchise([
      {
        mal_id: 100,
        title: "Attack on Titan",
        recommendationScore: 10,
      },
      {
        mal_id: 101,
        title: "Attack on Titan Season 2",
        recommendationScore: 12,
      },
      {
        mal_id: 102,
        title: "Steins;Gate",
        recommendationScore: 9,
      },
    ]);

    const titles = deduped.map((item) => item.title);

    expect(titles.filter((title) => /Attack on Titan/i.test(title))).toHaveLength(1);
    expect(titles).toContain("Steins;Gate");
  });

  test("Recommendation results contain valid anime entries", async () => {
    const { loadCandidatePool } = await vi.importActual(
      "../services/recommendationService"
    );

    mockSupabase.from.mockImplementation(() =>
      makeAnimeCacheQueryResult([
        makeRecommendation({
          mal_id: 200,
          title: "Valid Anime",
          image_url: "https://example.com/image.jpg",
          genres: ["Action"],
        }),
      ])
    );

    const results = await loadCandidatePool(new Set(), new Set(), 20);

    expect(results[0]).toEqual(
      expect.objectContaining({
        mal_id: 200,
        title: "Valid Anime",
        image_url: expect.any(String),
      })
    );
  });
});