import { supabase } from "../../supabaseClient.js";

const BASE_URL = "https://api.jikan.moe/v4";

function normalizeAnimeForCache(anime) {
  return {
    mal_id: anime.mal_id,
    title: anime.title || "",
    title_english: anime.title_english || null,
    synopsis: anime.synopsis || null,
    image_url:
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
    genres: (anime.genres || []).map((g) => g.name),
    themes: (anime.themes || []).map((t) => t.name),
    demographics: (anime.demographics || []).map((d) => d.name),
    studios: (anime.studios || []).map((s) => s.name),
  };
}

async function fetchTopAnimePage(page = 1) {
  const response = await fetch(`${BASE_URL}/top/anime?page=${page}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch page ${page}`);
  }

  const data = await response.json();
  return data.data || [];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedTopAnime(pages = 3, delayMs = 500) {
  const allAnime = [];

  for (let page = 1; page <= pages; page++) {
    console.log(`Fetching page ${page}...`);

    const results = await fetchTopAnimePage(page);
    const normalized = results.map(normalizeAnimeForCache);

    allAnime.push(...normalized);

    if (page < pages) {
      await delay(delayMs);
    }
  }

  const unique = Array.from(
    new Map(allAnime.map((a) => [a.mal_id, a])).values()
  );

  console.log(`Upserting ${unique.length} anime...`);

  const { data, error } = await supabase
    .from("anime_cache")
    .upsert(unique, { onConflict: "mal_id" });

  if (error) {
    throw error;
  }

  console.log("Done seeding!");
}

async function main() {
  const pages = Number(process.argv[2]) || 3;
  await seedTopAnime(pages);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});