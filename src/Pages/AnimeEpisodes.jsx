import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import EpisodeCard from "../components/EpisodeCard";
import bgImage from "../assets/generalbackground.png"; // adjust path as needed


function AnimeEpisodes() {
  const { id } = useParams();

  const [animeTitle, setAnimeTitle] = useState("");
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [loadingMoreEpisodes, setLoadingMoreEpisodes] = useState(false);
  const [episodePage, setEpisodePage] = useState(1);
  const [hasMoreEpisodes, setHasMoreEpisodes] = useState(true);
  const [visibleEpisodeCount, setVisibleEpisodeCount] = useState(20);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  async function fetchEpisodes(page = 1, replace = false) {
    try {
      if (page === 1) {
        setEpisodesLoading(true);
      } else {
        setLoadingMoreEpisodes(true);
      }

      const response = await fetch(
        `https://api.jikan.moe/v4/anime/${id}/episodes?page=${page}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch episodes");
      }

      const data = await response.json();
      const newEpisodes = data.data || [];

      if (replace) {
        setEpisodes(newEpisodes);
      } else {
        setEpisodes((prev) => [...prev, ...newEpisodes]);
      }

      setEpisodePage(page);
      setHasMoreEpisodes(!!data.pagination?.has_next_page);
    } catch (err) {
      console.error(err.message);
      setError(err.message);
    } finally {
      setEpisodesLoading(false);
      setLoadingMoreEpisodes(false);
    }
  }

  async function handleLoadMoreEpisodes() {
    const nextVisibleCount = visibleEpisodeCount + 20;

    if (nextVisibleCount <= episodes.length) {
      setVisibleEpisodeCount(nextVisibleCount);
      return;
    }

    if (hasMoreEpisodes && !loadingMoreEpisodes) {
      await fetchEpisodes(episodePage + 1, false);
    }

    setVisibleEpisodeCount(nextVisibleCount);
  }

  const hasMoreEpisodesToShow =
    visibleEpisodeCount < episodes.length || hasMoreEpisodes;

  useEffect(() => {
    async function fetchAnimeTitle() {
      try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch anime title");
        }

        const data = await response.json();
        setAnimeTitle(data.data?.title || "Anime");
      } catch (err) {
        console.error(err.message);
      }
    }

    async function fetchCurrentUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error fetching current user:", error.message);
        return;
      }

      setCurrentUser(user);
    }

    setEpisodes([]);
    setEpisodePage(1);
    setHasMoreEpisodes(true);
    setVisibleEpisodeCount(20);
    setError("");

    fetchAnimeTitle();
    fetchCurrentUser();
    fetchEpisodes(1, true);
  }, [id]);

  if (episodesLoading && episodes.length === 0) {
    return <p style={{ padding: "20px" }}>Loading episodes...</p>;
  }

  if (error && episodes.length === 0) {
    return (
      <div style={{ padding: "20px" }}>
        <p style={{ color: "red" }}>{error}</p>
        <Link to={`/anime/${id}`}>Back to Anime Details</Link>
      </div>
    );
  }

  return (<div
  className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed px-6 py-10"
  style={{ backgroundImage: `url(${bgImage})` }}
>
  <div className="max-w-5xl mx-auto bg-gray-800/90 rounded-2xl border border-gray-600 p-6">

    <Link
      to={`/anime/${id}`}
      className="inline-block mb-4 text-blue-300 hover:underline"
    >
      ← Back to Anime Details
    </Link>

    <h1 className="text-3xl font-bold text-white mb-6">
      {animeTitle} Episodes
    </h1>

    {episodes.length === 0 ? (
      <p className="text-gray-300">No episodes found.</p>
    ) : (
      <div className="flex flex-col gap-4">

        {episodes.slice(0, visibleEpisodeCount).map((episode) => (
          <div
            key={episode.mal_id}
            className="bg-gray-700/70 border border-gray-600 rounded-xl p-4"
          >
            <EpisodeCard
              animeId={parseInt(id)}
              episode={episode}
              currentUser={currentUser}
            />
          </div>
        ))}

        {hasMoreEpisodesToShow && (
          <button
            onClick={handleLoadMoreEpisodes}
            disabled={loadingMoreEpisodes}
            className="mt-3 px-5 py-2 rounded-full bg-gray-300/90 text-black font-semibold border border-gray-400 hover:bg-gray-200 transition disabled:opacity-60"
          >
            {loadingMoreEpisodes
              ? "Loading..."
              : "Load 20 More Episodes"}
          </button>
        )}

        {!hasMoreEpisodesToShow && episodes.length > 0 && (
          <p className="text-gray-300">
            No more episodes to load.
          </p>
        )}

      </div>
    )}
  </div>
</div>
  );
}

export default AnimeEpisodes;