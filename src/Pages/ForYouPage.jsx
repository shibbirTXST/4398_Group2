import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { getRecommendations } from "../services/recommendationService";
import { Link } from "react-router-dom";
import OnboardingIntro from "../components/foryou/OnboardingIntro";
import GenrePreferenceStep from "../components/foryou/GenrePreferenceStep";
import ReactionCard from "../components/foryou/ReactionCard";
import {
  getForYouSignalSummary,
  saveGenrePreferences,
  saveOnboardingResponse,
  getOnboardingCandidates,
  resetOnboardingData,
} from "../services/onboardingService";
import "../styles/forYou.css";

function ForYouPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [recommendations, setRecommendations] = useState([]);
  const [hasEnoughData, setHasEnoughData] = useState(true);
  const [mode, setMode] = useState("traditional");

  const [savingGenres, setSavingGenres] = useState(false);

  const [expandedWhy, setExpandedWhy] = useState({});
  const [feedbackLoading, setFeedbackLoading] = useState({});

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState("intro");
  const [signalSummary, setSignalSummary] = useState({
    totalSignals: 0,
    minimumSignals: 20,
    profileFavorites: [],
    counts: {
      profileFavorites: 0,
      animeRatings: 0,
      interactions: 0,
      genrePreferences: 0,
      onboardingResponses: 0,
    },
  });

  const [reactionCandidates, setReactionCandidates] = useState([]);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [savingReactionId, setSavingReactionId] = useState(null);
  const [resettingOnboarding, setResettingOnboarding] = useState(false);

  const [watchlistMap, setWatchlistMap] = useState({});
  const [watchlistLoading, setWatchlistLoading] = useState({});

  async function loadWatchlistStatus(userId, animeList) {
    const animeIds = (animeList || [])
      .map((anime) => Number(anime.mal_id))
      .filter(Boolean);

    if (!animeIds.length) {
      setWatchlistMap({});
      return;
    }

    const { data, error } = await supabase
      .from("watchlists")
      .select("anime_id")
      .eq("user_id", userId)
      .in("anime_id", animeIds);

    if (error) {
      throw error;
    }

    const nextMap = {};
    for (const row of data || []) {
      nextMap[row.anime_id] = true;
    }

    setWatchlistMap(nextMap);
  }

  const loadRecommendations = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not logged in");
      }

      const summary = await getForYouSignalSummary(user.id);
      setSignalSummary(summary);
      setHasEnoughData(summary.hasEnoughData);

      if (!summary.hasEnoughData) {
        setShowOnboarding(true);
        setRecommendations([]);
        setMode("onboarding");
        setWatchlistMap({});
        return;
      }

      setShowOnboarding(false);

      const result = await getRecommendations(user.id);
      setRecommendations(result.recommendations || []);
      setHasEnoughData(result.hasEnoughData);
      setMode(result.mode || "personalized");
      await loadWatchlistStatus(user.id, result.recommendations || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load recommendations");
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const loadReactionCandidates = useCallback(async () => {
    try {
      setLoadingReactions(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not logged in");
      }

      const candidates = await getOnboardingCandidates(user.id, 6);
      setReactionCandidates(candidates);
    } catch (err) {
      console.error(err);
      setError("Failed to load onboarding picks");
    } finally {
      setLoadingReactions(false);
    }
  }, []);

  useEffect(() => {
    if (
      showOnboarding &&
      onboardingStep === "reactions" &&
      reactionCandidates.length === 0
    ) {
      loadReactionCandidates();
    }
  }, [
    showOnboarding,
    onboardingStep,
    reactionCandidates.length,
    loadReactionCandidates,
  ]);

  const signalsRemaining = Math.max(
    0,
    (signalSummary.minimumSignals || 20) - (signalSummary.totalSignals || 0)
  );

  function handleOnboardingContinue() {
    setOnboardingStep("genres");
  }

  function handleOnboardingBackToIntro() {
    setOnboardingStep("intro");
  }

  function handleBackToGenres() {
    setOnboardingStep("genres");
  }

  async function handleSaveGenres({ likedGenres, dislikedGenres }) {
    try {
      setSavingGenres(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not logged in");
      }

      await saveGenrePreferences(user.id, likedGenres, dislikedGenres);

      const updatedSummary = await getForYouSignalSummary(user.id);
      setSignalSummary(updatedSummary);
      setHasEnoughData(updatedSummary.hasEnoughData);

      setOnboardingStep("reactions");
      setReactionCandidates([]);
      await loadReactionCandidates();
    } catch (err) {
      console.error(err);
      setError("Failed to save genre preferences");
    } finally {
      setSavingGenres(false);
    }
  }

  async function handleReactionResponse(anime, response) {
    try {
      setSavingReactionId(anime.mal_id);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not logged in");
      }

      await saveOnboardingResponse(user.id, anime, response);

      const nextCandidates = reactionCandidates.filter(
        (item) => item.mal_id !== anime.mal_id
      );
      setReactionCandidates(nextCandidates);

      const updatedSummary = await getForYouSignalSummary(user.id);
      setSignalSummary(updatedSummary);
      setHasEnoughData(updatedSummary.hasEnoughData);

      if (nextCandidates.length <= 2) {
        const newCandidates = await getOnboardingCandidates(user.id, 6);
        setReactionCandidates(newCandidates);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save onboarding response");
    } finally {
      setSavingReactionId(null);
    }
  }

  async function handleFinishOnboarding() {
    try {
      setError("");
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not logged in");
      }

      const result = await getRecommendations(user.id);

      setShowOnboarding(false);
      setRecommendations(result.recommendations || []);
      setHasEnoughData(result.hasEnoughData);
      setMode(result.mode || "personalized");
      await loadWatchlistStatus(user.id, result.recommendations || []);
    } catch (err) {
      console.error(err);
      setError("Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    await loadRecommendations(true);
  }

  async function handleOnboardingSkip() {
    try {
      setError("");
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not logged in");
      }

      const result = await getRecommendations(user.id);
      setShowOnboarding(false);
      setRecommendations(result.recommendations || []);
      setHasEnoughData(result.hasEnoughData);
      setMode(result.mode || "fallback");
      await loadWatchlistStatus(user.id, result.recommendations || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load fallback recommendations");
    } finally {
      setLoading(false);
    }
  }

  async function handleRedoOnboarding() {
    try {
      setResettingOnboarding(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not logged in");
      }

      await resetOnboardingData(user.id);

      const updatedSummary = await getForYouSignalSummary(user.id);
      setSignalSummary(updatedSummary);
      setHasEnoughData(updatedSummary.hasEnoughData);

      setRecommendations([]);
      setExpandedWhy({});
      setFeedbackLoading({});
      setWatchlistMap({});
      setWatchlistLoading({});
      setReactionCandidates([]);
      setOnboardingStep("intro");
      setShowOnboarding(true);
      setMode("onboarding");
    } catch (err) {
      console.error(err);
      setError("Failed to reset onboarding");
    } finally {
      setResettingOnboarding(false);
    }
  }

  function toggleWhyThis(malId) {
    setExpandedWhy((prev) => ({
      ...prev,
      [malId]: !prev[malId],
    }));
  }

  async function handleNotInterested(e, anime) {
    e.preventDefault();
    e.stopPropagation();

    setFeedbackLoading((prev) => ({
      ...prev,
      [anime.mal_id]: true,
    }));

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not logged in");
      }

      const { error: upsertError } = await supabase
        .from("user_anime_interactions")
        .upsert(
          [
            {
              user_id: user.id,
              mal_id: anime.mal_id,
              disliked: true,
              liked: false,
              is_favorite: false,
            },
          ],
          { onConflict: "user_id, mal_id" }
        );

      if (upsertError) {
        throw upsertError;
      }

      setRecommendations((prev) =>
        prev.filter((item) => item.mal_id !== anime.mal_id)
      );

      setExpandedWhy((prev) => {
        const updated = { ...prev };
        delete updated[anime.mal_id];
        return updated;
      });

      setFeedbackLoading((prev) => {
        const updated = { ...prev };
        delete updated[anime.mal_id];
        return updated;
      });
    } catch (err) {
      console.error(err);
      setError("Failed to save feedback");
      setFeedbackLoading((prev) => ({
        ...prev,
        [anime.mal_id]: false,
      }));
    }
  }

  async function handleToggleWatchlist(e, anime) {
    e.preventDefault();
    e.stopPropagation();

    setWatchlistLoading((prev) => ({
      ...prev,
      [anime.mal_id]: true,
    }));

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not logged in");
      }

      const animeId = Number(anime.mal_id);
      const isInWatchlist = !!watchlistMap[animeId];

      if (isInWatchlist) {
        const { error: removeError } = await supabase
          .from("watchlists")
          .delete()
          .eq("user_id", user.id)
          .eq("anime_id", animeId);

        if (removeError) throw removeError;

        setWatchlistMap((prev) => {
          const updated = { ...prev };
          delete updated[animeId];
          return updated;
        });
      } else {
        const { error: insertError } = await supabase
          .from("watchlists")
          .insert({
            user_id: user.id,
            anime_id: animeId,
            title: anime.title || anime.title_english || "",
            image_url: anime.image_url || null,
          });

        if (insertError) throw insertError;

        setWatchlistMap((prev) => ({
          ...prev,
          [animeId]: true,
        }));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update watchlist");
    } finally {
      setWatchlistLoading((prev) => ({
        ...prev,
        [anime.mal_id]: false,
      }));
    }
  }

  if (loading) {
    return (
      <div className="foryou-page">
        <div className="foryou-shell">
          <div className="foryou-panel">Loading recommendations...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="foryou-page">
        <div className="foryou-shell">
          <div className="foryou-panel">
            <p className="foryou-error mb-3">{error}</p>
            <button onClick={handleRefresh} className="foryou-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="foryou-page">
        <div className="foryou-shell">
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={handleRedoOnboarding}
              disabled={resettingOnboarding}
              className="foryou-button"
            >
              {resettingOnboarding ? "Resetting..." : "Redo Onboarding"}
            </button>
          </div>

          {onboardingStep === "intro" && (
            <OnboardingIntro
              profileFavorites={signalSummary.profileFavorites}
              totalSignals={signalSummary.totalSignals}
              minimumSignals={signalSummary.minimumSignals}
              onContinue={handleOnboardingContinue}
              onSkip={handleOnboardingSkip}
            />
          )}

          {onboardingStep === "genres" && (
            <GenrePreferenceStep
              onSave={handleSaveGenres}
              onBack={handleOnboardingBackToIntro}
              onSkip={handleOnboardingSkip}
              saving={savingGenres}
            />
          )}

          {onboardingStep === "reactions" && (
            <div className="space-y-6">
              <div className="foryou-panel space-y-2">
                <h2 className="text-xl font-bold">Quick picks</h2>

                <p className="text-sm foryou-muted">
                  Tell us what looks interesting, and we’ll use that to improve
                  your first recommendations.
                </p>

                <p className="text-sm foryou-soft">
                  {hasEnoughData
                    ? "You’ve added enough preference signals to generate personalized recommendations."
                    : `Add ${signalsRemaining} more preference signals for stronger personalized recommendations.`}
                </p>

                <p className="text-xs foryou-soft">
                  Current signals: {signalSummary.totalSignals} /{" "}
                  {signalSummary.minimumSignals}
                </p>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleBackToGenres}
                  className="foryou-button"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  className="foryou-button foryou-button-primary"
                >
                  {hasEnoughData
                    ? "Get My Recommendations"
                    : "Continue with Current Preferences"}
                </button>

                <button
                  type="button"
                  onClick={handleOnboardingSkip}
                  className="foryou-button"
                >
                  Skip for now
                </button>
              </div>

              {loadingReactions ? (
                <div className="foryou-panel">
                  <p className="text-sm foryou-muted">Loading quick picks...</p>
                </div>
              ) : reactionCandidates.length === 0 ? (
                <div className="foryou-panel space-y-3">
                  <p className="text-sm foryou-muted">
                    No onboarding picks are available right now.
                  </p>
                  <button
                    type="button"
                    onClick={handleFinishOnboarding}
                    className="foryou-button foryou-button-primary"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {reactionCandidates.map((anime) => (
                    <ReactionCard
                      key={anime.mal_id}
                      anime={anime}
                      loading={savingReactionId === anime.mal_id}
                      onLike={(selectedAnime) =>
                        handleReactionResponse(selectedAnime, "like")
                      }
                      onUnsure={(selectedAnime) =>
                        handleReactionResponse(selectedAnime, "unsure")
                      }
                      onDislike={(selectedAnime) =>
                        handleReactionResponse(selectedAnime, "dislike")
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="foryou-page">
      <div className="foryou-shell">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="foryou-title">For You</h1>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="foryou-button"
            >
              {refreshing ? "Refreshing..." : "Refresh Recommendations"}
            </button>

            <button
              type="button"
              onClick={handleRedoOnboarding}
              disabled={resettingOnboarding}
              className="foryou-button"
            >
              {resettingOnboarding ? "Resetting..." : "Redo Onboarding"}
            </button>
          </div>
        </div>

        {!hasEnoughData && (
          <div className="foryou-panel mb-4">
            <p className="mb-2 foryou-muted">
              We need a bit more information to personalize your recommendations.
            </p>
            <Link to="/profile" className="foryou-link underline">
              Edit your profile favorites
            </Link>
          </div>
        )}

        {mode === "fallback" && (
          <p className="mb-4 text-sm foryou-soft">
            Showing popular anime while we learn your preferences.
          </p>
        )}

        {recommendations.length === 0 ? (
          <div className="foryou-panel foryou-empty space-y-3">
            <p>No recommendations available.</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="foryou-button"
            >
              {refreshing ? "Refreshing..." : "Refresh Recommendations"}
            </button>
          </div>
        ) : (
          <div className="foryou-grid">
            {recommendations.map((anime) => {
              const whyExpanded = !!expandedWhy[anime.mal_id];
              const isFeedbackLoading = !!feedbackLoading[anime.mal_id];
              const isInWatchlist = !!watchlistMap[anime.mal_id];
              const isWatchlistLoading = !!watchlistLoading[anime.mal_id];

              return (
                <div key={anime.mal_id} className="foryou-card">
                  <div className="flex gap-4">
                    <Link
                      to={`/anime/${anime.mal_id}`}
                      className="shrink-0 foryou-link"
                    >
                      {anime.image_url ? (
                        <img
                          src={anime.image_url}
                          alt={anime.title_english || anime.title}
                          className="w-20 h-28 object-cover foryou-image"
                        />
                      ) : (
                        <div className="w-20 h-28 border rounded flex items-center justify-center text-xs foryou-soft">
                          No Image
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/anime/${anime.mal_id}`}
                        className="foryou-link"
                      >
                        <h2 className="font-semibold">
                          {anime.title_english || anime.title}
                        </h2>
                      </Link>

                      {anime.score && (
                        <p className="text-sm foryou-soft mt-1">
                          Score: {anime.score}
                        </p>
                      )}

                      {anime.genres?.length > 0 && (
                        <p className="text-sm foryou-soft mt-1">
                          Genres:{" "}
                          {anime.genres
                            .map((genre) =>
                              typeof genre === "string" ? genre : genre.name
                            )
                            .filter(Boolean)
                            .slice(0, 3)
                            .join(", ")}
                        </p>
                      )}

                      <div className="flex gap-2 mt-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleWhyThis(anime.mal_id)}
                          className="foryou-button text-sm"
                        >
                          {whyExpanded ? "Hide Why This" : "Why This?"}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleToggleWatchlist(e, anime)}
                          disabled={isWatchlistLoading}
                          className="foryou-button text-sm"
                        >
                          {isWatchlistLoading
                            ? "Updating..."
                            : isInWatchlist
                              ? "Remove from Watchlist"
                              : "Add to Watchlist"}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleNotInterested(e, anime)}
                          disabled={isFeedbackLoading}
                          className="foryou-button text-sm"
                        >
                          {isFeedbackLoading ? "Saving..." : "Not Interested"}
                        </button>
                      </div>

                      {whyExpanded && (
                        <div className="foryou-why text-sm">
                          {anime.explanation?.length ? (
                            <ul className="list-disc ml-5 space-y-1">
                              {anime.explanation.map((line, index) => (
                                <li key={index}>{line}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="foryou-soft">
                              This was recommended based on your saved
                              preferences.
                            </p>
                          )}
                        </div>
                      )}

                      {anime.synopsis && (
                        <p className="text-sm mt-3 foryou-muted">
                          {anime.synopsis.length > 400
                            ? `${anime.synopsis.slice(0, 400)}...`
                            : anime.synopsis}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ForYouPage;