import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { searchAnime } from "../services/jikanApi";

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [animeResults, setAnimeResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) return;

    async function fetchResults() {
      setLoading(true);
      setError("");
      try {
        const results = await searchAnime(query);
        setAnimeResults(results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [query]);

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-8">
      <h1 className="text-3xl font-bold 800 mb-6">
        Search Results for "{query}"
      </h1>

      {loading && <p className="500">Loading results...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && animeResults.length === 0 && query && (
        <p className="500">No anime found matching your search.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {animeResults.map((anime) => (
          <Link
            key={anime.mal_id}
            to={`/anime/${anime.mal_id}`}
            className="flex flex-col gap-2 group cursor-pointer"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-200">
              {anime.images?.jpg?.image_url && (
                <img
                  src={anime.images.jpg.image_url}
                  alt={anime.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
            </div>
            <div>
              <h3 className="font-bold 800 line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
                {anime.title}
              </h3>
              <div className="flex gap-2 items-center mt-1">
                <span className="text-xs font-medium bg-100 600 px-2 py-0.5 rounded">
                  {anime.type || 'TV'}
                </span>
                <span className="text-xs">
                  ★ {anime.score || 'N/A'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
