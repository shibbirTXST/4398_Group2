import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function EpisodeCard({ animeId, episode, currentUser }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingRatingId, setExistingRatingId] = useState(null);

  const [showReviewForm, setShowReviewForm] = useState(false);

  const [showCommunityReviews, setShowCommunityReviews] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);

  useEffect(() => {
    async function fetchExistingEpisodeRating() {
      if (!currentUser) return;

      const { data, error } = await supabase
        .from("episode_ratings")
        .select("id, rating, review_text")
        .eq("user_id", currentUser.id)
        .eq("anime_id", animeId)
        .eq("episode_id", episode.mal_id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching existing episode rating:", error.message);
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
    }

    fetchExistingEpisodeRating();
  }, [animeId, episode.mal_id, currentUser]);

  async function submitEpisodeRating() {
    if (!currentUser) {
      alert("You must be logged in to rate an episode.");
      return;
    }

    if (rating < 1 || rating > 10) {
      alert("Please select a rating from 1 to 10.");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from("episode_ratings").upsert(
        {
          user_id: currentUser.id,
          anime_id: animeId,
          episode_id: episode.mal_id,
          episode_number: episode.mal_id,
          rating: rating,
          review_text: reviewText,
        },
        {
          onConflict: "user_id,anime_id,episode_id",
        }
      );

      if (error) throw error;

      alert(existingRatingId ? "Episode rating updated!" : "Episode rating saved!");

      const { data, error: refreshError } = await supabase
        .from("episode_ratings")
        .select("id, rating, review_text")
        .eq("user_id", currentUser.id)
        .eq("anime_id", animeId)
        .eq("episode_id", episode.mal_id)
        .maybeSingle();

      if (refreshError) {
        console.error("Error refreshing episode rating:", refreshError.message);
      } else if (data) {
        setExistingRatingId(data.id);
        setRating(data.rating ?? 0);
        setReviewText(data.review_text ?? "");
      }

      if (showCommunityReviews) {
        resetAndLoadReviews();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save episode rating.");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadReviews(pageToLoad = 0, replace = false) {
    try {
      setReviewsLoading(true);

      const from = pageToLoad * 10;
      const to = from + 9;

      const { data, error } = await supabase
        .from("episode_ratings")
        .select("id, user_id, rating, review_text, created_at")
        .eq("anime_id", animeId)
        .eq("episode_id", episode.mal_id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newReviews = data || [];

      if (replace) {
        setReviews(newReviews);
      } else {
        setReviews((prev) => [...prev, ...newReviews]);
      }

      setHasMoreReviews(newReviews.length === 10);
      setReviewsPage(pageToLoad);
    } catch (err) {
      console.error("Error loading episode reviews:", err.message);
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

  async function handleToggleCommunityReviews() {
    const nextValue = !showCommunityReviews;
    setShowCommunityReviews(nextValue);

    if (nextValue && reviews.length === 0) {
      await resetAndLoadReviews();
    }
  }

  async function handleLoadMoreReviews() {
    if (!hasMoreReviews || reviewsLoading) return;
    await loadReviews(reviewsPage + 1, false);
  }

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "12px",
        marginBottom: "12px",
        borderRadius: "8px",
      }}
    >
      <p>
        <strong>Episode {episode.mal_id}:</strong> {episode.title || "Untitled Episode"}
      </p>

      {episode.aired && (
        <p>
          <strong>Aired:</strong> {formatDate(episode.aired)}
        </p>
      )}

      {existingRatingId ? (
        <p style={{ color: "green" }}>
          You already rated this episode. You can update it below.
        </p>
      ) : (
        <p>You have not rated this episode yet.</p>
      )}

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
        <button onClick={() => setShowReviewForm((prev) => !prev)}>
          {showReviewForm ? "Hide Rating Form" : "Rate Episode"}
        </button>

        <button onClick={handleToggleCommunityReviews}>
          {showCommunityReviews ? "Hide Reviews" : "Show Reviews"}
        </button>
      </div>

      {showReviewForm && (
        <div style={{ marginTop: "16px" }}>
          <label><strong>Rating (1–10)</strong></label>
          <br />
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            style={{ marginTop: "8px", padding: "8px" }}
          >
            <option value={0}>Select rating</option>
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>

          <br /><br />

          <label><strong>Review</strong></label>
          <br />
          <textarea
            placeholder="Write your episode review..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows="4"
            cols="60"
            style={{ marginTop: "8px", padding: "8px" }}
          />

          <br /><br />

          <button onClick={submitEpisodeRating} disabled={submitting}>
            {submitting
              ? "Saving..."
              : existingRatingId
              ? "Update Episode Rating"
              : "Submit Episode Rating"}
          </button>
        </div>
      )}

      {showCommunityReviews && (
        <div style={{ marginTop: "20px" }}>
          <h4>Episode Reviews</h4>

          {reviewsLoading && reviews.length === 0 ? (
            <p>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p>No reviews yet.</p>
          ) : (
            <>
              {reviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    border: "1px solid #444",
                    padding: "10px",
                    marginBottom: "10px",
                    borderRadius: "8px",
                    backgroundColor: "#1f2937",
                    color: "#f9fafb",
                  }}
                >
                  <p>
                    <strong>Rating:</strong> {review.rating}/10
                  </p>

                  <p>
                    <strong>Date:</strong> {formatDate(review.created_at)}
                  </p>

                  {currentUser && review.user_id === currentUser.id && (
                    <p style={{ color: "blue" }}>
                      <strong>Your review</strong>
                    </p>
                  )}

                  <p>{review.review_text || "No written review provided."}</p>
                </div>
              ))}

              {hasMoreReviews && (
                <button onClick={handleLoadMoreReviews} disabled={reviewsLoading}>
                  {reviewsLoading ? "Loading..." : "Load 10 More"}
                </button>
              )}

            </>
          )}
        </div>
      )}
    </div>
  );
}

export default EpisodeCard;