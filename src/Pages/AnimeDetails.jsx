import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import bgImage from "../assets/generalbackground.png"; // adjust path as needed


function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function AnimeDetails() {
  const { id } = useParams();

  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [existingRatingId, setExistingRatingId] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);

  useEffect(() => {
    async function fetchAnimeDetails() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);

        if (!response.ok) {
          throw new Error("Failed to fetch anime details");
        }

        const data = await response.json();
        setAnime(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    async function fetchCurrentUserAndExistingRating() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError.message);
        return;
      }

      setCurrentUser(user);

      if (!user) return;

      const { data, error } = await supabase
        .from("anime_ratings")
        .select("id, rating, review_text")
        .eq("user_id", user.id)
        .eq("anime_id", parseInt(id))
        .maybeSingle();

      if (error) {
        console.error("Error fetching existing rating:", error.message);
        return;
      }

      if (data) {
        setExistingRatingId(data.id);
        setRating(data.rating ?? 0);
        setReviewText(data.review_text ?? "");
      } else {
        setExistingRatingId(null);
        setRating(0);
        setReviewText("");
      }

      const { data: watchlistData, error: watchlistError } = await supabase
        .from("watchlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("anime_id", parseInt(id))
        .maybeSingle();

      if (watchlistError) {
        console.error("Error fetching watchlist status:", watchlistError.message);
      } else if (watchlistData) {
        setInWatchlist(true);
      } else {
        setInWatchlist(false);
      }
    }

    fetchAnimeDetails();
    fetchCurrentUserAndExistingRating();

  }, [id]);

  async function submitAnimeRating() {
    if (!currentUser) {
      alert("You must be logged in to rate an anime.");
      return;
    }

    if (rating < 1 || rating > 10) {
      alert("Please select a rating from 1 to 10.");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from("anime_ratings").upsert(
        {
          user_id: currentUser.id,
          anime_id: parseInt(id),
          rating: rating,
          review_text: reviewText,
        },
        {
          onConflict: "user_id,anime_id",
        }
      );

      if (error) throw error;

      alert(existingRatingId ? "Rating updated!" : "Rating saved!");

      // Refresh the user's rating so UI stays in sync
      const { data, error: fetchError } = await supabase
        .from("anime_ratings")
        .select("id, rating, review_text")
        .eq("user_id", currentUser.id)
        .eq("anime_id", parseInt(id))
        .maybeSingle();

      if (fetchError) {
        console.error(fetchError.message);
      } else if (data) {
        setExistingRatingId(data.id);
        setRating(data.rating ?? 0);
        setReviewText(data.review_text ?? "");
      }

      // If reviews are open, refresh them from the start
      if (showReviews) {
        resetAndLoadReviews();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save rating.");
    } finally {
      setSubmitting(false);
    }
  }

async function toggleWatchlist() {
  if (!currentUser) {
    alert("You must be logged in to add to your watchlist.");
    return;
  }

  if (!anime) {
    alert("Anime data is still loading.");
    return;
  }

  const animeId = Number(id);
  if (!Number.isInteger(animeId)) {
    alert("Invalid anime ID.");
    return;
  }

  setWatchlistLoading(true);

  try {
    if (inWatchlist) {
      const { error } = await supabase
        .from("watchlists")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("anime_id", animeId);

      if (error) throw error;
      setInWatchlist(false);
    } else {
      const { error } = await supabase
        .from("watchlists")
        .insert([
          {
            user_id: currentUser.id,
            anime_id: animeId,
            title: anime.title ?? null,
            image_url: anime.images?.jpg?.image_url ?? null,
          },
        ]);

      if (error) throw error;
      setInWatchlist(true);
    }
  } catch (err) {
    console.error("Watchlist error:", {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code,
      full: err,
    });
    alert(err.message || "Failed to update watchlist.");
  } finally {
    setWatchlistLoading(false);
  }
}

  async function loadReviews(pageToLoad = 0, replace = false) {
    try {
      setReviewsLoading(true);

      const from = pageToLoad * 10;
      const to = from + 9;

      const { data, error } = await supabase
        .from("anime_ratings")
        .select("id, user_id, rating, review_text, created_at, updated_at")
        .eq("anime_id", parseInt(id))
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newReviews = data || [];

      if (replace) {
        setReviews(newReviews);
      } else {
        setReviews((prev) => [...prev, ...newReviews]);
      }

      (newReviews.length === 10);
      setReviewsPage(pageToLoad);
    } catch (err) {
      console.error("Error loading reviews:", err.message);
    } finally {
      setReviewsLoading(false);
    }
  }

  async function resetAndLoadReviews() {
    setReviews([]);
    setReviewsPage(0);
    setHasMoreReviews(true);
    await loadReviews(0, true);
  }

  async function handleToggleReviews() {
    const nextValue = !showReviews;
    setShowReviews(nextValue);

    if (nextValue && reviews.length === 0) {
      await resetAndLoadReviews();
    }
  }

  async function handleLoadMoreReviews() {
    if (!hasMoreReviews || reviewsLoading) return;
    await loadReviews(reviewsPage + 1, false);
  }


  if (loading) {
    return <p style={{ padding: "20px" }}>Loading anime details...</p>;
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <p style={{ color: "red" }}>{error}</p>
        {/* <Link to="/dashboard">Back to Dashboard</Link> */}
      </div>
    );
  }

  if (!anime) {
    return (
      <div style={{ padding: "20px" }}>
        <p>Anime not found.</p>
        {/* <Link to="/dashboard">Back to Dashboard</Link> */}
      </div>
    );
  }

  return (
    <div
  className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed px-6 py-10"
  style={{ backgroundImage: `url(${bgImage})` }}
>
  <div className="max-w-5xl mx-auto bg-gray-800/90 rounded-2xl border border-gray-600 p-6">

    {/* Title */}
    <h1 className="text-3xl font-bold text-white mb-4">
      {anime.title}
    </h1>

    {/* Watchlist Button */}
    {currentUser ? (
      <button
        onClick={toggleWatchlist}
        disabled={watchlistLoading}
        className="mb-6 px-5 py-2 rounded-full bg-gray-300/90 text-black font-semibold border border-gray-400 hover:bg-gray-200 transition disabled:opacity-60"
      >
        {watchlistLoading
          ? "Updating..."
          : inWatchlist
            ? "Remove from Watchlist"
            : "Add to Watchlist"}
      </button>
    ) : (
      <p className="mb-6 text-gray-300 italic">
        <Link to="/signin" className="text-blue-300 hover:underline">
          Log in
        </Link>{" "}
        to add this to your watchlist.
      </p>
    )}

    {/* 🔥 IMAGE + INFO SIDE BY SIDE */}
    <div className="flex flex-col md:flex-row gap-6 mb-6">

      {anime.images?.jpg?.image_url && (
        <img
          src={anime.images.jpg.image_url}
          alt={anime.title}
          className="w-[200px] h-auto rounded-lg border border-gray-500"
        />
      )}

      <div className="flex flex-col justify-center text-white gap-2">
        <p><strong>Score:</strong> {anime.score ?? "N/A"}</p>
        <p><strong>Episodes:</strong> {anime.episodes ?? "Unknown"}</p>
        <p><strong>Status:</strong> {anime.status ?? "Unknown"}</p>
        <p><strong>Rating:</strong> {anime.rating ?? "Unknown"}</p>
      </div>

    </div>

    {/* Synopsis */}
    <h2 className="text-xl font-semibold text-white mb-2">Synopsis</h2>
    <p className="text-gray-200 mb-6">
      {anime.synopsis || "No synopsis available."}
    </p>

    <hr className="border-gray-600 my-6" />

    {/* Rating Section */}
    <h2 className="text-xl font-semibold text-white mb-2">
      Anime Rating / Review
    </h2>

    {existingRatingId ? (
      <p className="text-green-400">
        You already rated this anime. You can update it below.
      </p>
    ) : (
      <p className="text-gray-300">
        You have not rated this anime yet.
      </p>
    )}

    <div className="mt-4 mb-6">

      <label className="text-white font-semibold">Rating (1–10)</label>
      <br />
      <select
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="mt-2 px-3 py-2 rounded-md text-black bg-white"
      >
        <option value={0}>Select rating</option>
        {[...Array(10)].map((_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>

      <br /><br />

      <label className="text-white font-semibold">Review</label>
      <br />
      <textarea
        placeholder="Write your review..."
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        rows="5"
        className="mt-2 w-full max-w-xl px-3 py-2 rounded-md text-black bg-white"
      />

      <br /><br />

      <button
        onClick={submitAnimeRating}
        disabled={submitting}
        className="px-5 py-2 rounded-full bg-gray-300/90 text-black font-semibold border border-gray-400 hover:bg-gray-200 transition"
      >
        {submitting
          ? "Saving..."
          : existingRatingId
            ? "Update Rating"
            : "Submit Rating"}
      </button>
    </div>

    <hr className="border-gray-600 my-6" />

    {/* Reviews */}
    <h2 className="text-xl font-semibold text-white mb-3">
      Community Reviews
    </h2>

    <button
      onClick={handleToggleReviews}
      className="mb-4 px-4 py-2 rounded-full bg-gray-300/90 text-black font-semibold hover:bg-gray-200 transition"
    >
      {showReviews ? "Hide Reviews" : "Show Reviews"}
    </button>

    {showReviews && (
      <div>
        {reviewsLoading && reviews.length === 0 ? (
          <p className="text-gray-300">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-gray-300">No reviews yet.</p>
        ) : (
          <>
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border border-gray-600 rounded-lg p-4 mb-3 bg-gray-700 text-white"
              >
                <p><strong>Rating:</strong> {review.rating}/10</p>
                <p><strong>Date:</strong> {formatDate(review.created_at)}</p>

                {currentUser && review.user_id === currentUser.id && (
                  <p className="text-blue-300 font-semibold">Your review</p>
                )}

                <p>{review.review_text || "No written review provided."}</p>
              </div>
            ))}

            {hasMoreReviews && (
              <button
                onClick={handleLoadMoreReviews}
                disabled={reviewsLoading}
                className="px-4 py-2 rounded-full bg-gray-300/90 text-black font-semibold hover:bg-gray-200 transition"
              >
                {reviewsLoading ? "Loading..." : "Load 10 More"}
              </button>
            )}

            {!hasMoreReviews && reviews.length > 0 && (
              <p className="text-gray-300 mt-2">No more reviews to load.</p>
            )}
          </>
        )}
      </div>
    )}

    <hr className="border-gray-600 my-6" />

    {/* Episodes */}
    <h2 className="text-xl font-semibold text-white mb-2">Episodes</h2>
    <p className="text-gray-300 mb-2">
      View the episode list and rate individual episodes on a separate page.
    </p>

    <Link
      to={`/anime/${id}/episodes`}
      className="inline-block px-5 py-2 rounded-full bg-gray-300/90 text-black font-semibold border border-gray-400 hover:bg-gray-200 transition"
    >
      View Episodes
    </Link>

    <hr className="border-gray-600 my-6" />

    {/* Discussion */}
    <h2 className="text-xl font-semibold text-white mb-2">
      Community Discussion
    </h2>
    <p className="text-gray-300 mb-2">
      Share your thoughts and discuss this anime with other fans.
    </p>

    <Link
      to={`/anime/${id}/discussions`}
      className="inline-block px-5 py-2 rounded-full bg-[#b6353a] text-white font-medium hover:bg-[#9e2d31] transition"
    >
      Go to Discussion Board
    </Link>

  </div>
</div>
  );
}

export default AnimeDetails;