import { supabase } from "../supabaseClient";
import { upsertAnimeCache } from "./animeCacheService";
import {
  dedupeByFranchise,
  buildFranchiseKeySet,
  getFranchiseKey,
  filterObviousBadEntryPoints
} from "./dedupingService";

const MINIMUM_SIGNALS = 20;

export async function getProfileFavorites(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("favorite_animes")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data?.favorite_animes || [];
}

export async function getForYouSignalSummary(userId) {
  const [
    profileResult,
    ratingsResult,
    interactionsResult,
    genresResult,
    onboardingResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("favorite_animes")
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("anime_ratings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    supabase
      .from("user_anime_interactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    supabase
      .from("user_genre_preferences")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    supabase
      .from("user_onboarding_responses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (ratingsResult.error) throw ratingsResult.error;
  if (interactionsResult.error) throw interactionsResult.error;
  if (genresResult.error) throw genresResult.error;
  if (onboardingResult.error) throw onboardingResult.error;

  const profileFavorites = profileResult.data?.favorite_animes || [];

  const totalSignals =
    profileFavorites.length +
    (ratingsResult.count || 0) +
    (interactionsResult.count || 0) +
    (genresResult.count || 0) +
    (onboardingResult.count || 0);

  return {
    hasEnoughData: totalSignals >= MINIMUM_SIGNALS,
    totalSignals,
    minimumSignals: MINIMUM_SIGNALS,
    profileFavorites,
    counts: {
      profileFavorites: profileFavorites.length,
      animeRatings: ratingsResult.count || 0,
      interactions: interactionsResult.count || 0,
      genrePreferences: genresResult.count || 0,
      onboardingResponses: onboardingResult.count || 0,
    },
  };
}

export async function saveGenrePreferences(
  userId,
  likedGenres = [],
  dislikedGenres = []
) {
  const { error: deleteError } = await supabase
    .from("user_genre_preferences")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  const rows = [
    ...likedGenres.map((genre) => ({
      user_id: userId,
      genre_name: genre,
      preference_type: "like",
    })),
    ...dislikedGenres.map((genre) => ({
      user_id: userId,
      genre_name: genre,
      preference_type: "dislike",
    })),
  ];

  if (!rows.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("user_genre_preferences")
    .insert(rows)
    .select();

  if (error) throw error;

  return data || [];
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
      genres
    `)
    .in("mal_id", normalizedIds);

  if (error) throw error;
  return data || [];
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function scoreOnboardingCandidate(anime, likedGenres, dislikedGenres) {
  let score = 0;
  const animeGenres = safeArray(anime.genres).map((genre) =>
    typeof genre === "string" ? genre : genre?.name
  ).filter(Boolean);

  for (const genre of animeGenres) {
    if (likedGenres.includes(genre)) {
      score += 4;
    }

    if (dislikedGenres.includes(genre)) {
      score -= 5;
    }
  }

  if (anime.score != null) {
    score += Number(anime.score) * 0.15;
  }

  if (anime.members != null && Number(anime.members) > 0) {
    score += Math.min(Math.log10(Number(anime.members)), 6) * 0.5;
  }

  return score;
}

export async function getOnboardingCandidates(userId, limit = 6) {
  const [
    profileResult,
    ratingsResult,
    interactionsResult,
    onboardingResult,
    genresResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("favorite_animes")
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("anime_ratings")
      .select("anime_id")
      .eq("user_id", userId),

    supabase
      .from("user_anime_interactions")
      .select("mal_id")
      .eq("user_id", userId),

    supabase
      .from("user_onboarding_responses")
      .select("mal_id")
      .eq("user_id", userId),

    supabase
      .from("user_genre_preferences")
      .select("genre_name, preference_type")
      .eq("user_id", userId),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (ratingsResult.error) throw ratingsResult.error;
  if (interactionsResult.error) throw interactionsResult.error;
  if (onboardingResult.error) throw onboardingResult.error;
  if (genresResult.error) throw genresResult.error;

  const profileFavorites = profileResult.data?.favorite_animes || [];

  const excludedIds = new Set([
    ...profileFavorites.map((item) => Number(item.mal_id)).filter(Boolean),
    ...(ratingsResult.data || []).map((item) => Number(item.anime_id)).filter(Boolean),
    ...(interactionsResult.data || []).map((item) => Number(item.mal_id)).filter(Boolean),
    ...(onboardingResult.data || []).map((item) => Number(item.mal_id)).filter(Boolean),
  ]);

  const knownAnimeFromCache = await fetchAnimeCacheByIds([...excludedIds]);
  const excludedFranchiseKeys = buildFranchiseKeySet([
    ...profileFavorites,
    ...knownAnimeFromCache,
  ]);

  const likedGenres = (genresResult.data || [])
    .filter((item) => item.preference_type === "like")
    .map((item) => item.genre_name);

  const dislikedGenres = (genresResult.data || [])
    .filter((item) => item.preference_type === "dislike")
    .map((item) => item.genre_name);

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
      genres
    `)
    .order("members", { ascending: false })
    .limit(100);

  if (error) throw error;

  const filtered = (data || []).filter((anime) => {
    if (!anime?.mal_id) return false;
    if (excludedIds.has(Number(anime.mal_id))) return false;
    if (excludedFranchiseKeys.has(getFranchiseKey(anime))) return false;
    return true;
  });

  const cleaned = filterObviousBadEntryPoints(filtered);
  const deduped = dedupeByFranchise(cleaned);

  const scored = deduped
    .map((anime) => ({
      ...anime,
      onboardingScore: scoreOnboardingCandidate(anime, likedGenres, dislikedGenres),
    }))
    .sort((a, b) => b.onboardingScore - a.onboardingScore);

  return scored.slice(0, limit);
}

export async function saveOnboardingResponse(userId, anime, response) {
  if (!anime?.mal_id) throw new Error("Missing anime mal_id");

  if (!["like", "unsure", "dislike"].includes(response)) {
    throw new Error("Invalid onboarding response");
  }

  const normalizedAnime = {
    mal_id: anime.mal_id,
    title: anime.title || "",
    title_english: anime.title_english || null,
    synopsis: anime.synopsis || null,
    image_url:
      anime.image_url ||
      anime.images?.jpg?.large_image_url ||
      anime.images?.jpg?.image_url ||
      anime.images?.webp?.large_image_url ||
      anime.images?.webp?.image_url ||
      null,
    type: anime.type || null,
    episodes: anime.episodes || null,
    score: anime.score || null,
    popularity: anime.popularity || null,
    members: anime.members || null,
    year: anime.year || null,
    season: anime.season || null,
    genres: Array.isArray(anime.genres)
      ? anime.genres
          .map((g) => (typeof g === "string" ? g : g.name))
          .filter(Boolean)
      : [],
  };

  await upsertAnimeCache([normalizedAnime]);

  const { data, error } = await supabase
    .from("user_onboarding_responses")
    .upsert(
      [
        {
          user_id: userId,
          mal_id: anime.mal_id,
          response,
        },
      ],
      { onConflict: "user_id, mal_id" }
    )
    .select();

  if (error) throw error;

  return data || [];
}

export async function resetOnboardingData(userId) {
  const [genreDelete, responseDelete] = await Promise.all([
    supabase
      .from("user_genre_preferences")
      .delete()
      .eq("user_id", userId),

    supabase
      .from("user_onboarding_responses")
      .delete()
      .eq("user_id", userId),
  ]);

  if (genreDelete.error) throw genreDelete.error;
  if (responseDelete.error) throw responseDelete.error;

  return true;
}