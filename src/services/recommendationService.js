import { supabase } from "../supabaseClient";
import { getForYouSignalSummary } from "./onboardingService";
import {
  dedupeByFranchise,
  dedupeScoredByFranchise,
  buildFranchiseKeySet,
  getFranchiseKey,
  filterObviousBadEntryPoints,
} from "./dedupingService";

const MINIMUM_SIGNALS = 20;

export async function getRecommendations(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const inputs = await getRecommendationInputs(userId);
  const excludedIds = buildExcludedIds(inputs);
  const excludedFranchiseKeys = await buildExcludedFranchiseKeys(inputs);
  const candidates = await loadCandidatePool(
    excludedIds,
    excludedFranchiseKeys,
    300
  );

  if (!inputs.hasEnoughData) {
    return {
      recommendations: candidates.slice(0, 20).map((anime) => ({
        ...anime,
        explanation: ["Popular anime while we learn your preferences."],
      })),
      hasEnoughData: false,
      mode: "fallback",
    };
  }

  const scoredCandidates = scoreCandidates(candidates, inputs);

  return {
    recommendations: scoredCandidates.slice(0, 20),
    hasEnoughData: true,
    mode: "personalized",
  };
}

export async function getRecommendationInputs(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const [
    signalSummary,
    ratingsResult,
    interactionsResult,
    genrePreferencesResult,
    onboardingResponsesResult,
  ] = await Promise.all([
    getForYouSignalSummary(userId),

    supabase
      .from("anime_ratings")
      .select("anime_id, rating")
      .eq("user_id", userId),

    supabase
      .from("user_anime_interactions")
      .select("mal_id, rating, liked, disliked, is_favorite, watch_status")
      .eq("user_id", userId),

    supabase
      .from("user_genre_preferences")
      .select("genre_name, preference_type")
      .eq("user_id", userId),

    supabase
      .from("user_onboarding_responses")
      .select("mal_id, response")
      .eq("user_id", userId),
  ]);

  if (ratingsResult.error) throw ratingsResult.error;
  if (interactionsResult.error) throw interactionsResult.error;
  if (genrePreferencesResult.error) throw genrePreferencesResult.error;
  if (onboardingResponsesResult.error) throw onboardingResponsesResult.error;

  const animeRatings = ratingsResult.data || [];
  const interactions = interactionsResult.data || [];
  const genrePreferences = genrePreferencesResult.data || [];
  const onboardingResponses = onboardingResponsesResult.data || [];

  const likedGenres = genrePreferences
    .filter((item) => item.preference_type === "like")
    .map((item) => item.genre_name);

  const dislikedGenres = genrePreferences
    .filter((item) => item.preference_type === "dislike")
    .map((item) => item.genre_name);

  const likedOnboardingIds = onboardingResponses
    .filter((item) => item.response === "like")
    .map((item) => Number(item.mal_id));

  const dislikedOnboardingIds = onboardingResponses
    .filter((item) => item.response === "dislike")
    .map((item) => Number(item.mal_id));

  const unsureOnboardingIds = onboardingResponses
    .filter((item) => item.response === "unsure")
    .map((item) => Number(item.mal_id));

  const [likedOnboardingAnime, dislikedOnboardingAnime] = await Promise.all([
    fetchAnimeCacheByIds(likedOnboardingIds),
    fetchAnimeCacheByIds(dislikedOnboardingIds),
  ]);

  return {
    userId,
    totalSignals: signalSummary.totalSignals || 0,
    hasEnoughData: signalSummary.hasEnoughData || false,
    minimumSignals: signalSummary.minimumSignals || MINIMUM_SIGNALS,

    profileFavorites: signalSummary.profileFavorites || [],
    animeRatings,
    interactions,
    genrePreferences,
    onboardingResponses,

    likedGenres,
    dislikedGenres,
    likedOnboardingIds,
    dislikedOnboardingIds,
    unsureOnboardingIds,
    likedOnboardingAnime,
    dislikedOnboardingAnime,

    counts: {
      profileFavorites: signalSummary.profileFavorites?.length || 0,
      animeRatings: animeRatings.length,
      interactions: interactions.length,
      genrePreferences: genrePreferences.length,
      onboardingResponses: onboardingResponses.length,
    },
  };
}

export function buildExcludedIds(inputs) {
  const excludedIds = new Set();

  for (const anime of inputs.profileFavorites || []) {
    if (anime?.mal_id != null) {
      excludedIds.add(Number(anime.mal_id));
    }
  }

  for (const rating of inputs.animeRatings || []) {
    if (rating?.anime_id != null) {
      excludedIds.add(Number(rating.anime_id));
    }
  }

  for (const interaction of inputs.interactions || []) {
    if (interaction?.mal_id != null) {
      excludedIds.add(Number(interaction.mal_id));
    }
  }

  for (const response of inputs.onboardingResponses || []) {
    if (response?.mal_id == null) continue;

    if (response.response === "dislike") {
      excludedIds.add(Number(response.mal_id));
    }
  }

  return excludedIds;
}

export async function buildExcludedFranchiseKeys(inputs) {
  const knownIds = [
    ...(inputs.animeRatings || []).map((item) => Number(item.anime_id)),
    ...(inputs.interactions || []).map((item) => Number(item.mal_id)),
    ...(inputs.onboardingResponses || []).map((item) => Number(item.mal_id)),
  ].filter(Boolean);

  const knownAnimeFromCache = await fetchAnimeCacheByIds(knownIds);

  return buildFranchiseKeySet([
    ...(inputs.profileFavorites || []),
    ...knownAnimeFromCache,
  ]);
}

export async function loadCandidatePool(
  excludedIds,
  excludedFranchiseKeys,
  limit = 300
) {
  const fetchLimit = Math.max(limit * 3, 100);

  const { data, error } = await supabase
    .from("anime_cache")
    .select(`
      mal_id,
      title,
      title_english,
      synopsis,
      image_url,
      type,
      episodes,
      score,
      popularity,
      members,
      year,
      season,
      genres,
      themes,
      demographics,
      studios
    `)
    .not("image_url", "is", null)
    .order("members", { ascending: false })
    .limit(fetchLimit);

  if (error) {
    throw error;
  }

  const filtered = (data || []).filter((anime) => {
    if (!anime?.mal_id) return false;
    if (excludedIds.has(Number(anime.mal_id))) return false;
    if (excludedFranchiseKeys.has(getFranchiseKey(anime))) return false;
    return true;
  });

  const cleaned = filterObviousBadEntryPoints(filtered);
  const deduped = dedupeByFranchise(cleaned);

  return deduped.slice(0, limit);
}

export function scoreCandidates(candidates, inputs) {
  const favoriteGenreCounts = buildGenreFrequencyMap(
    inputs.profileFavorites || []
  );
  const likedSeedGenreCounts = buildGenreFrequencyMap(
    inputs.likedOnboardingAnime || []
  );
  const dislikedSeedGenreCounts = buildGenreFrequencyMap(
    inputs.dislikedOnboardingAnime || []
  );

  const scored = candidates
    .map((anime) => {
      const scoringDetails = getCandidateScoringDetails(
        anime,
        inputs,
        favoriteGenreCounts,
        likedSeedGenreCounts,
        dislikedSeedGenreCounts
      );

      const recommendationScore = scoreCandidate(scoringDetails);
      const explanation = buildExplanation(anime, scoringDetails);

      return {
        ...anime,
        recommendationScore,
        explanation,
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore);

  return dedupeScoredByFranchise(scored);
}

function getCandidateScoringDetails(
  anime,
  inputs,
  favoriteGenreCounts,
  likedSeedGenreCounts,
  dislikedSeedGenreCounts
) {
  const candidateGenres = getGenreNames(anime);

  const matchingFavoriteGenres = candidateGenres.filter(
    (genre) => favoriteGenreCounts[genre]
  );

  const matchingLikedSeedGenres = candidateGenres.filter(
    (genre) => likedSeedGenreCounts[genre]
  );

  const matchingDislikedSeedGenres = candidateGenres.filter(
    (genre) => dislikedSeedGenreCounts[genre]
  );

  const matchingLikedGenres = candidateGenres.filter((genre) =>
    (inputs.likedGenres || []).includes(genre)
  );

  const matchingDislikedGenres = candidateGenres.filter((genre) =>
    (inputs.dislikedGenres || []).includes(genre)
  );

  const sourcesMatched = [
    matchingFavoriteGenres.length > 0,
    matchingLikedSeedGenres.length > 0,
    matchingLikedGenres.length > 0,
  ].filter(Boolean).length;

  return {
    anime,
    candidateGenres,
    matchingFavoriteGenres,
    matchingLikedSeedGenres,
    matchingDislikedSeedGenres,
    matchingLikedGenres,
    matchingDislikedGenres,
    sourcesMatched,
    favoriteGenreCounts,
    likedSeedGenreCounts,
    dislikedSeedGenreCounts,
  };
}

function scoreCandidate(details) {
  const {
    anime,
    matchingFavoriteGenres,
    matchingLikedSeedGenres,
    matchingDislikedSeedGenres,
    matchingLikedGenres,
    matchingDislikedGenres,
    favoriteGenreCounts,
    likedSeedGenreCounts,
    dislikedSeedGenreCounts,
    sourcesMatched,
  } = details;

  let score = 0;

  for (const genre of matchingFavoriteGenres) {
    score += 5;
    score += Math.min(favoriteGenreCounts[genre] || 0, 3) * 1.25;
  }

  for (const genre of matchingLikedSeedGenres) {
    score += 3.5;
    score += Math.min(likedSeedGenreCounts[genre] || 0, 2) * 1.0;
  }

  for (const genre of matchingLikedGenres) {
    score += 2.5;
  }

  for (const genre of matchingDislikedSeedGenres) {
    score -= 5.5;
    score -= Math.min(dislikedSeedGenreCounts[genre] || 0, 2) * 1.25;
  }

  for (const genre of matchingDislikedGenres) {
    score -= 6;
  }

  if (sourcesMatched >= 2) {
    score += 4;
  }

  if (sourcesMatched >= 3) {
    score += 3;
  }

  const totalPositiveMatches =
    matchingFavoriteGenres.length +
    matchingLikedSeedGenres.length +
    matchingLikedGenres.length;

  score += Math.min(totalPositiveMatches, 5) * 0.75;

  if (anime.score != null) {
    score += Number(anime.score) * 0.12;
  }

  if (anime.members != null && Number(anime.members) > 0) {
    score += Math.min(Math.log10(Number(anime.members)), 6) * 0.35;
  }

  if (anime.popularity != null && Number(anime.popularity) > 0) {
    score += Math.max(0, 2 - Math.log10(Number(anime.popularity))) * 0.35;
  }

  if (
    matchingFavoriteGenres.length === 0 &&
    matchingLikedSeedGenres.length === 0 &&
    matchingLikedGenres.length === 0
  ) {
    score -= 2;
  }

  return score;
}

function buildExplanation(anime, details) {
  const {
    matchingFavoriteGenres,
    matchingLikedSeedGenres,
    matchingLikedGenres,
    matchingDislikedSeedGenres,
    matchingDislikedGenres,
    sourcesMatched,
  } = details;

  const reasons = [];

  if (matchingFavoriteGenres.length > 0) {
    reasons.push({
      priority: 100,
      text: `Matches genres from your favorites: ${matchingFavoriteGenres
        .slice(0, 3)
        .join(", ")}.`,
    });
  }

  if (matchingLikedSeedGenres.length > 0) {
    reasons.push({
      priority: 90,
      text: `Similar to anime you reacted positively to through: ${matchingLikedSeedGenres
        .slice(0, 3)
        .join(", ")}.`,
    });
  }

  if (matchingLikedGenres.length > 0) {
    reasons.push({
      priority: 75,
      text: `Includes genres you said you like: ${matchingLikedGenres
        .slice(0, 3)
        .join(", ")}.`,
    });
  }

  if (sourcesMatched >= 2) {
    reasons.push({
      priority: 80,
      text: "Matches multiple parts of your preference profile.",
    });
  }

  if (reasons.length < 2 && anime.score != null && Number(anime.score) >= 8) {
    reasons.push({
      priority: 40,
      text: `Highly rated with a score of ${anime.score}.`,
    });
  }

  if (
    reasons.length < 2 &&
    anime.members != null &&
    Number(anime.members) >= 100000
  ) {
    reasons.push({
      priority: 30,
      text: "Popular with a large audience on MyAnimeList.",
    });
  }

  if (reasons.length === 0) {
    if (
      matchingDislikedSeedGenres.length === 0 &&
      matchingDislikedGenres.length === 0
    ) {
      reasons.push({
        priority: 10,
        text: "Recommended based on your saved preferences.",
      });
    } else {
      reasons.push({
        priority: 10,
        text: "Included as a lower-confidence match from your current profile.",
      });
    }
  }

  return reasons
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map((reason) => reason.text);
}

async function fetchAnimeCacheByIds(ids) {
  const normalizedIds = [...new Set((ids || []).map(Number).filter(Boolean))];

  if (!normalizedIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("anime_cache")
    .select(`
      mal_id,
      title,
      title_english,
      synopsis,
      image_url,
      type,
      episodes,
      score,
      popularity,
      members,
      year,
      season,
      genres,
      themes,
      demographics,
      studios
    `)
    .in("mal_id", normalizedIds);

  if (error) {
    throw error;
  }

  return data || [];
}

function getGenreNames(anime) {
  if (!Array.isArray(anime?.genres)) return [];

  return anime.genres
    .map((genre) => {
      if (typeof genre === "string") return genre;
      if (genre && typeof genre.name === "string") return genre.name;
      return null;
    })
    .filter(Boolean);
}

function buildGenreFrequencyMap(animeList) {
  const counts = {};

  for (const anime of animeList) {
    for (const genre of getGenreNames(anime)) {
      counts[genre] = (counts[genre] || 0) + 1;
    }
  }

  return counts;
}