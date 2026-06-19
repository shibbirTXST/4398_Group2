import { supabase } from "../supabaseClient";

const BASE_URL = "https://api.jikan.moe/v4";

function normalizeAnimeForCache(anime) {
  return {
    mal_id: anime.mal_id,
    title: anime.title || "",
    title_english: anime.title_english || null,
    synopsis: anime.synopsis || null,
    image_url: anime.images?.jpg?.large_image_url ||
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
    genres: (anime.genres || []).map((g) => g.name),
    themes: (anime.themes || []).map((t) => t.name),
    demographics: (anime.demographics || []).map((d) => d.name),
    studios: (anime.studios || []).map((s) => s.name),
  };
}

async function fetchJson(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Jikan request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function fetchAnimeByIdFromJikan(malId) {
  const data = await fetchJson(`${BASE_URL}/anime/${malId}/full`);
  return normalizeAnimeForCache(data.data);
}

export async function searchAnimeForCaching(query, limit = 10) {
  if (!query.trim()) return [];

  const data = await fetchJson(
    `${BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=${limit}`
  );

  return (data.data || []).map(normalizeAnimeForCache);
}

export async function upsertAnimeCache(animeList) {
  if (!animeList.length) return [];

  const { data, error } = await supabase
    .from("anime_cache")
    .upsert(animeList, { onConflict: "mal_id" })
    .select();

  if (error) {
    throw error;
  }

  return data || [];
}

export async function cacheAnimeById(malId) {
  const anime = await fetchAnimeByIdFromJikan(malId);
  const saved = await upsertAnimeCache([anime]);
  return saved[0] || anime;
}

export async function searchAndCacheAnime(query, limit = 10) {
  const animeList = await searchAnimeForCaching(query, limit);

  if (!animeList.length) return [];

  await upsertAnimeCache(animeList);
  return animeList;
}

export async function getAnimeFromCacheById(malId) {
  const { data, error } = await supabase
    .from("anime_cache")
    .select("*")
    .eq("mal_id", malId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrCacheAnimeById(malId) {
  const cached = await getAnimeFromCacheById(malId);
  if (cached) return cached;

  return cacheAnimeById(malId);
}