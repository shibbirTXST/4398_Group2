import { Link } from "react-router-dom";

function AnimeCard({ anime }) {
  return (
    <Link
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
        <h3 className="font-bold text-800 line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
          {anime.title}
        </h3>

        <div className="flex gap-2 items-center mt-1">
          <span className="text-xs font-medium bg-100 text-600 px-2 py-0.5 rounded">
            {anime.type || "TV"}
          </span>
          <span className="text-xs">
            ★ {anime.score || "N/A"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default AnimeCard;