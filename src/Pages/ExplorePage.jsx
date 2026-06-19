import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ExploreControls from "../components/explore/ExploreControls";
import AnimeSection from "../components/explore/AnimeSection";
import bgImage from "../assets/generalbackground.png"; // adjust path as needed


const genreNames = {
  "1": "Action",
  "2": "Adventure",
  "4": "Comedy",
  "8": "Drama",
  "10": "Fantasy",
  "14": "Horror",
  "22": "Romance",
  "24": "Sci-Fi",
  "36": "Slice of Life",
  "37": "Supernatural",
};

function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const genresParam = searchParams.get("genres") || "";
  const selectedGenres = genresParam
    ? genresParam.split(",").filter(Boolean)
    : [];

  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("default");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setPage(1);
    setAnimeList([]);
  }, [selectedGenres.join(",")]);

  useEffect(() => {
    async function fetchExploreAnime() {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        setError("");

        let url = `https://api.jikan.moe/v4/top/anime?page=${page}`;

        if (selectedGenres.length > 0) {
          url = `https://api.jikan.moe/v4/anime?genres=${selectedGenres.join(",")}&order_by=score&sort=desc&page=${page}`;
          setMode("genre");
        } else {
          setMode("default");
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch anime.");
        }

        const data = await response.json();
        const newAnime = data.data || [];
        const nextPageExists = data.pagination?.has_next_page || false;

        if (page === 1) {
          setAnimeList(newAnime);
        } else {
          setAnimeList((prev) => {
            const existingIds = new Set(prev.map((anime) => anime.mal_id));
            const filteredNewAnime = newAnime.filter(
              (anime) => !existingIds.has(anime.mal_id)
            );
            return [...prev, ...filteredNewAnime];
          });
        }

        setHasMore(nextPageExists);
      } catch (err) {
        setError(err.message);

        if (page === 1) {
          setAnimeList([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }

    fetchExploreAnime();
  }, [selectedGenres.join(","), page]);

  function handleGenreToggle(genreId) {
    const genreIdString = String(genreId);

    let updatedGenres;

    if (selectedGenres.includes(genreIdString)) {
      updatedGenres = selectedGenres.filter((id) => id !== genreIdString);
    } else {
      updatedGenres = [...selectedGenres, genreIdString];
    }

    if (updatedGenres.length === 0) {
      setSearchParams({});
    } else {
      setSearchParams({ genres: updatedGenres.join(",") });
    }
  }

  function handleClearGenres() {
    setSearchParams({});
  }

  async function handleRandomAnime() {
    try {
      const response = await fetch("https://api.jikan.moe/v4/random/anime");

      if (!response.ok) {
        throw new Error("Failed to fetch a random anime.");
      }

      const data = await response.json();
      const randomAnime = data.data;

      if (randomAnime?.mal_id) {
        navigate(`/anime/${randomAnime.mal_id}`);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  function handleLoadMore() {
    if (!loadingMore && hasMore) {
      setPage((prev) => prev + 1);
    }
  }

  let text = "Trending anime";

  if (mode === "genre" && selectedGenres.length > 0) {
    const selectedGenreNames = selectedGenres.map(
      (id) => genreNames[id] || "Unknown Genre"
    );
    text = `Browsing genres: ${selectedGenreNames.join(", ")}`;
  }

 return (
  <div
    className="min-h-screen w-full bg-center bg-cover bg-no-repeat bg-fixed py-10"
    style={{ backgroundImage: `url(${bgImage})` }}
  >
    <div className="max-w-[1440px] mx-auto px-8 py-8 bg-gray-800/90 rounded-2xl">
      
      <ExploreControls
        selectedGenres={selectedGenres}
        onGenreToggle={handleGenreToggle}
        onClearGenres={handleClearGenres}
        onRandomClick={handleRandomAnime}
      />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">{text}</h1>
        <p className="text-sm text-gray-300 mt-1">
          {animeList.length} result{animeList.length === 1 ? "" : "s"}
        </p>
      </div>

      <AnimeSection
        loading={loading}
        error={error}
        animeList={animeList}
      />

    </div>
  </div>
);
}
export default ExplorePage;