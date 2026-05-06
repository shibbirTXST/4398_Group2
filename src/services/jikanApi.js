const BASE_URL = "https://api.jikan.moe/v4";

export async function searchAnime(query) {
  if (!query.trim()) return [];

  const res = await fetch(
    `${BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=10`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch anime search results");
  }

  const data = await res.json();
  return data.data;
}

export async function getAnimeById(id) {
  const res = await fetch(`${BASE_URL}/anime/${id}/full`);

  if (!res.ok) {
    throw new Error("Failed to fetch anime details");
  }

  const data = await res.json();
  return data.data;
}

export async function getAnimeEpisodes(id, page = 1) {
  const res = await fetch(`${BASE_URL}/anime/${id}/episodes?page=${page}`);

  if (!res.ok) {
    throw new Error("Failed to fetch anime episodes");
  }

  const data = await res.json();
  return data.data;
}