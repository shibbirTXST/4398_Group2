function getDisplayTitle(anime) {
  return (anime?.title_english || anime?.title || "").trim();
}

function normalizeRomanNumerals(title = "") {
  return title
    .replace(/\bii\b/g, " 2 ")
    .replace(/\biii\b/g, " 3 ")
    .replace(/\biv\b/g, " 4 ")
    .replace(/\bv\b/g, " 5 ")
    .replace(/\bvi\b/g, " 6 ");
}

function cleanTitle(title = "") {
  let raw = normalizeRomanNumerals(title.toLowerCase().trim());

  if (subtitleLooksLikeContinuation(raw)) {
    raw = raw.split(":")[0].trim();
  }

  return raw
    .replace(/&/g, " and ")
    .replace(/[:\-!,.;()'"]/g, " ")

    // continuation phrases
    .replace(/\bfinal season\b/g, "")
    .replace(/\bthe final\b/g, "")
    .replace(/\bsecond season\b/g, "")
    .replace(/\bthird season\b/g, "")
    .replace(/\bfourth season\b/g, "")
    .replace(/\bfifth season\b/g, "")

    .replace(/\bseason\s+\d+\b/g, "")
    .replace(/\b\d+(st|nd|rd|th)\s+season\b/g, "")

    .replace(/\bpart\s+\d+\b/g, "")
    .replace(/\b\d+(st|nd|rd|th)\s+part\b/g, "")

    .replace(/\bcour\s+\d+\b/g, "")
    .replace(/\bchapter\s+\d+\b/g, "")
    .replace(/\barc\b/g, "")

    .replace(/\bthe movie\b/g, "")
    .replace(/\bmovie\s+\d+\b/g, "")
    .replace(/\bmovie\b/g, "")
    .replace(/\bfilm\b/g, "")
    .replace(/\bfinale\b/g, "")
    .replace(/\bova\b/g, "")
    .replace(/\bona\b/g, "")
    .replace(/\bspecial\b/g, "")
    .replace(/\brecap\b/g, "")
    .replace(/\bsummary\b/g, "")

    // franchise-specific-ish continuation wording that shows up often
    .replace(/\bnext passage\b/g, "")

    // trailing sequel numbers like "Chihayafuru 2"
    .replace(/\s+\d+$/g, "")

    .replace(/\s+/g, " ")
    .trim();
}
function subtitleLooksLikeContinuation(title = "") {
  const lower = normalizeRomanNumerals(title.toLowerCase()).trim();

  const parts = lower.split(":");
  if (parts.length < 2) {
    return false;
  }

  const subtitle = parts.slice(1).join(":").trim();

  return (
    /\bfinal season\b/.test(subtitle) ||
    /\bthe final\b/.test(subtitle) ||
    /\bsecond season\b/.test(subtitle) ||
    /\bthird season\b/.test(subtitle) ||
    /\bfourth season\b/.test(subtitle) ||
    /\bfifth season\b/.test(subtitle) ||
    /\bseason\s+\d+\b/.test(subtitle) ||
    /\b\d+(st|nd|rd|th)\s+season\b/.test(subtitle) ||
    /\bpart\s+\d+\b/.test(subtitle) ||
    /\b\d+(st|nd|rd|th)\s+part\b/.test(subtitle) ||
    /\bcour\s+\d+\b/.test(subtitle) ||
    /\bchapter\s+\d+\b/.test(subtitle) ||
    /\barc\b/.test(subtitle) ||
    /\bthe movie\b/.test(subtitle) ||
    /\bmovie\b/.test(subtitle) ||
    /\bfilm\b/.test(subtitle) ||
    /\bfinale\b/.test(subtitle) ||
    /\bova\b/.test(subtitle) ||
    /\bona\b/.test(subtitle) ||
    /\bspecial\b/.test(subtitle) ||
    /\brecap\b/.test(subtitle) ||
    /\bsummary\b/.test(subtitle)
  );
}

function titleLooksLikeContinuation(title = "") {
  const lower = normalizeRomanNumerals(title.toLowerCase()).trim();

  return (
    subtitleLooksLikeContinuation(title) ||
    /\bfinal season\b/.test(lower) ||
    /\bthe final\b/.test(lower) ||
    /\bsecond season\b/.test(lower) ||
    /\bthird season\b/.test(lower) ||
    /\bfourth season\b/.test(lower) ||
    /\bfifth season\b/.test(lower) ||
    /\bseason\s+\d+\b/.test(lower) ||
    /\b\d+(st|nd|rd|th)\s+season\b/.test(lower) ||
    /\bpart\s+\d+\b/.test(lower) ||
    /\b\d+(st|nd|rd|th)\s+part\b/.test(lower) ||
    /\bcour\s+\d+\b/.test(lower) ||
    /\bchapter\s+\d+\b/.test(lower) ||
    /\barc\b/.test(lower) ||
    /\bthe movie\b/.test(lower) ||
    /\bmovie\b/.test(lower) ||
    /\bfilm\b/.test(lower) ||
    /\bfinale\b/.test(lower) ||
    /\bova\b/.test(lower) ||
    /\bona\b/.test(lower) ||
    /\bspecial\b/.test(lower) ||
    /\brecap\b/.test(lower) ||
    /\bsummary\b/.test(lower) ||
    /\bnext passage\b/.test(lower) ||
    /\b\d+\s+(2|3|4|5|6|7|8|9)\b/.test(lower) ||
    /\s+\d+$/.test(lower)
  );
}

export function isLikelyBadEntryPoint(anime) {
  const displayTitle = getDisplayTitle(anime);
  const lower = normalizeRomanNumerals(displayTitle.toLowerCase());

  if (titleLooksLikeContinuation(displayTitle)) {
    return true;
  }

  if (
    anime?.type === "OVA" ||
    anime?.type === "ONA" ||
    anime?.type === "Special"
  ) {
    return true;
  }

  // standalone movie follow-ups are often bad starter recs
  if (/\bthe movie\b/.test(lower) || /\bmovie\b/.test(lower)) {
    return true;
  }

  return false;
}

export function getFranchiseKey(anime) {
  return cleanTitle(getDisplayTitle(anime));
}

export function buildFranchiseKeySet(animeList) {
  const keys = new Set();

  for (const anime of animeList || []) {
    const key = getFranchiseKey(anime);
    if (key) {
      keys.add(key);
    }
  }

  return keys;
}

export function getFranchiseRepresentativeScore(anime) {
  let score = 0;
  const displayTitle = getDisplayTitle(anime);

  if (anime?.type === "TV") score += 30;
  if (anime?.type === "Movie") score += 2;
  if (
    anime?.type === "OVA" ||
    anime?.type === "ONA" ||
    anime?.type === "Special"
  ) {
    score -= 18;
  }

  if (titleLooksLikeContinuation(displayTitle)) {
    score -= 35;
  } else {
    score += 20;
  }

  if (anime?.score != null) {
    score += Number(anime.score) * 1.5;
  }

  if (anime?.members != null && Number(anime.members) > 0) {
    score += Math.min(Math.log10(Number(anime.members)), 6) * 3;
  }

  if (anime?.year != null && Number(anime.year) > 0) {
    score -= (Number(anime.year) - 1950) * 0.01;
  }

  score -= displayTitle.length * 0.03;

  return score;
}

export function filterObviousBadEntryPoints(animeList) {
  const filtered = (animeList || []).filter((anime) => !isLikelyBadEntryPoint(anime));

  // If filtering would wipe out almost everything, fall back to original list.
  if (filtered.length >= Math.max(5, Math.floor((animeList || []).length * 0.25))) {
    return filtered;
  }

  return animeList || [];
}

export function dedupeByFranchise(animeList) {
  const bestByFranchise = new Map();

  for (const anime of animeList || []) {
    if (!anime?.mal_id) continue;

    const franchiseKey = getFranchiseKey(anime);
    if (!franchiseKey) continue;

    const existing = bestByFranchise.get(franchiseKey);

    if (!existing) {
      bestByFranchise.set(franchiseKey, anime);
      continue;
    }

    const existingScore = getFranchiseRepresentativeScore(existing);
    const currentScore = getFranchiseRepresentativeScore(anime);

    if (currentScore > existingScore) {
      bestByFranchise.set(franchiseKey, anime);
    }
  }

  return Array.from(bestByFranchise.values());
}

export function dedupeScoredByFranchise(animeList) {
  const bestByFranchise = new Map();

  for (const anime of animeList || []) {
    if (!anime?.mal_id) continue;

    const franchiseKey = getFranchiseKey(anime);
    if (!franchiseKey) continue;

    const existing = bestByFranchise.get(franchiseKey);

    if (!existing) {
      bestByFranchise.set(franchiseKey, anime);
      continue;
    }

    const existingScore = Number(existing.recommendationScore || 0);
    const currentScore = Number(anime.recommendationScore || 0);

    if (currentScore > existingScore) {
      bestByFranchise.set(franchiseKey, anime);
    }
  }

  return Array.from(bestByFranchise.values()).sort(
    (a, b) =>
      Number(b.recommendationScore || 0) -
      Number(a.recommendationScore || 0)
  );
}