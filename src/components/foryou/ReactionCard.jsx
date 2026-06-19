import { Link } from "react-router-dom";

function getImageUrl(anime) {
  return (
    anime.image_url ||
    anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url ||
    anime.images?.webp?.large_image_url ||
    anime.images?.webp?.image_url ||
    null
  );
}

function getGenres(anime) {
  if (!Array.isArray(anime.genres)) return [];
  return anime.genres
    .map((genre) => (typeof genre === "string" ? genre : genre.name))
    .filter(Boolean);
}

function ReactionCard({
  anime,
  onLike,
  onUnsure,
  onDislike,
  loading = false,
}) {
  const imageUrl = getImageUrl(anime);
  const genres = getGenres(anime);

  return (
    <div className="foryou-card flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="w-24 shrink-0">
          <div className="aspect-[3/4] rounded-xl overflow-hidden border foryou-image">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={anime.title_english || anime.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs foryou-soft">
                No Image
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-lg leading-tight text-white">
              {anime.title_english || anime.title}
            </h3>

            <Link
              to={`/anime/${anime.mal_id}`}
              className="text-sm underline shrink-0 foryou-link"
            >
              View Details
            </Link>
          </div>

          <div className="flex gap-2 items-center mt-2 flex-wrap">
            <span className="text-xs font-medium border px-2 py-0.5 rounded foryou-chip">
              {anime.type || "TV"}
            </span>
            <span className="text-xs foryou-soft">
              ★ {anime.score || "N/A"}
            </span>
          </div>

          {genres.length > 0 && (
            <p className="text-sm foryou-soft mt-2">
              Genres: {genres.slice(0, 3).join(", ")}
            </p>
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

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onLike(anime)}
          disabled={loading}
          className="foryou-button foryou-button-primary"
        >
          I’d like this
        </button>

        <button
          type="button"
          onClick={() => onUnsure(anime)}
          disabled={loading}
          className="foryou-button"
        >
          Not sure
        </button>

        <button
          type="button"
          onClick={() => onDislike(anime)}
          disabled={loading}
          className="foryou-button"
        >
          Not for me
        </button>
      </div>
    </div>
  );
}

export default ReactionCard;