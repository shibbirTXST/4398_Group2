import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { searchAnime } from "../services/jikanApi";
import bgImage from "../assets/generalbackground.png"; // adjust path as needed


export default function ProfilePage({ logout }) {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [animeSearchQuery, setAnimeSearchQuery] = useState("");
  const [animeSearchResults, setAnimeSearchResults] = useState([]);
  const [searchingAnime, setSearchingAnime] = useState(false);
  const [editFavorites, setEditFavorites] = useState([]);

  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/signin"); return; }
    setCurrentUser(user);

    const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    setProfile(profileData);

    const { data: reviewData } = await supabase
        .from("anime_ratings")
        .select("id, anime_id, rating, review_text, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

    const reviewsWithTitles = await Promise.all(
        (reviewData || []).map(async (review) => {
            try {
                const res = await fetch(`https://api.jikan.moe/v4/anime/${review.anime_id}`);
                const json = await res.json();
                return { ...review, anime_title: json.data?.title || `Anime #${review.anime_id}` };
            } catch {
                return { ...review, anime_title: `Anime #${review.anime_id}` };
            }
        })
    );

      setRecentReviews(reviewsWithTitles);
      setLoading(false);
    }

    loadProfile();
  }, [navigate]);

  function openEdit() {
    setEditUsername(profile?.username || "");
    setEditAvatarUrl(profile?.avatar_url || "");
    setEditFavorites(profile?.favorite_animes || []);
    setAnimeSearchQuery("");
    setAnimeSearchResults([]);
    setSaveError("");
    setEditMode(true);
  }

  async function saveProfile() {
    setSaving(true);
    setSaveError("");

    const { error } = await supabase
      .from("profiles")
      .update({
        username: editUsername.trim(),
        avatar_url: editAvatarUrl.trim() || null,
        favorite_animes: editFavorites,
      })
      .eq("id", currentUser.id);

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setProfile((prev) => ({
      ...prev,
      username: editUsername.trim(),
      avatar_url: editAvatarUrl.trim() || null,
      favorite_animes: editFavorites,
    }));

    setSaving(false);
    setEditMode(false);
  }

  useEffect(() => {
    if (!animeSearchQuery.trim()) { setAnimeSearchResults([]); return; }
    const delay = setTimeout(async () => {
      setSearchingAnime(true);
      try {
        const results = await searchAnime(animeSearchQuery);
        setAnimeSearchResults(results.slice(0, 6));
      } catch {
        setAnimeSearchResults([]);
      } finally {
        setSearchingAnime(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [animeSearchQuery]);

  function addFavorite(anime) {
    if (editFavorites.length >= 4) return;
    if (editFavorites.find((a) => a.mal_id === anime.mal_id)) return;
    setEditFavorites([...editFavorites, {
      mal_id: anime.mal_id,
      title: anime.title,
      image_url: anime.images?.jpg?.image_url || null,
    }]);
    setAnimeSearchQuery("");
    setAnimeSearchResults([]);
  }

  function removeFavorite(mal_id) {
    setEditFavorites(editFavorites.filter((a) => a.mal_id !== mal_id));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    logout();
  }

  async function handleDeleteAccount() {
    setDeleteError("");
    if (confirmText !== "confirm") {
      setDeleteError('You must type "confirm" to delete your account.');
      return;
    }
    setDeleteLoading(true);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      await supabase.auth.signOut();
      logout();
      navigate("/signup");
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-stone-500">Loading profile...</p>
    </div>
  );

  const avatarSrc = profile?.avatar_url ||
    "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

  return (
    <div
  className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed px-6 py-10"
  style={{ backgroundImage: `url(${bgImage})` }}
>
  <div className="max-w-4xl mx-auto px-6 py-10 bg-gray-800/90 border border-gray-600 rounded-2xl">

    {/* Profile Header */}
    <div className="flex items-center gap-6 mb-10">
      <img
        src={avatarSrc}
        alt="Profile"
        className="w-24 h-24 rounded-full object-cover border-4 border-[#b6353a]/20"
      />

      <div className="flex-1">
        <h1 className="text-2xl font-bold text-white">
          {profile?.username || "Anonymous"}
        </h1>

        <p className="text-sm text-gray-300 mt-1">
          {currentUser?.email}
        </p>
      </div>

      <button
        onClick={openEdit}
        className="px-4 py-2 rounded-full bg-[#b6353a] text-white text-sm font-medium hover:bg-[#9e2d31] transition-colors"
      >
        Edit Profile
      </button>
    </div>

    {/* Favorite Animes */}
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-600 pb-2">
        Top Favorite Animes
      </h2>

      {(!profile?.favorite_animes || profile.favorite_animes.length === 0) ? (
        <p className="text-gray-300 text-sm italic">
          No favorites set yet. Edit your profile to add some!
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {profile.favorite_animes.map((anime) => (
            <a
              key={anime.mal_id}
              href={`/anime/${anime.mal_id}`}
              className="flex flex-col gap-2 group"
            >
              <div
                className="rounded-xl overflow-hidden bg-gray-700 border border-gray-600"
                style={{ aspectRatio: "3/4" }}
              >
                {anime.image_url ? (
                  <img
                    src={anime.image_url}
                    alt={anime.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700" />
                )}
              </div>

              <p className="text-xs font-semibold text-gray-200 line-clamp-2 group-hover:text-[#ffb4b8] transition-colors">
                {anime.title}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>

    {/* Recent Reviews */}
    <section>
      <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-600 pb-2">
        Most Recent Reviews
      </h2>

      {recentReviews.length === 0 ? (
        <p className="text-gray-300 text-sm italic">
          No reviews yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {recentReviews.map((review) => (
            <a
              key={review.id}
              href={`/anime/${review.anime_id}`}
              className="block bg-gray-700/70 border border-gray-600 rounded-xl px-5 py-4 hover:border-[#b6353a]/40 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">
                  {review.anime_title || `Anime #${review.anime_id}`}
                </span>

                <span className="text-xs bg-[#b6353a]/20 text-[#ffb4b8] font-bold px-2 py-0.5 rounded-full">
                  {review.rating}/10
                </span>
              </div>

              <p className="text-sm text-gray-300 line-clamp-2">
                {review.review_text || "No written review."}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                {new Date(review.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>

    {/* Account */}
    <section className="pt-6 border-t border-gray-600 mt-10">
      <h2 className="text-lg font-bold text-white mb-4 text-center">
        Account
      </h2>

      <div className="flex flex-col items-center gap-4">

        <button
          onClick={handleLogout}
          className="w-fit px-4 py-2 rounded-full border border-gray-500 text-gray-200 text-sm hover:bg-gray-700 transition-colors"
        >
          Log Out
        </button>

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="w-fit text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2 max-w-sm">

            <p className="text-sm text-red-400 text-center">
              Type <b>confirm</b> to permanently delete your account.
            </p>

            <div className="flex gap-2">

              <input
                placeholder='Type "confirm"'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="border border-gray-500 bg-transparent rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />

              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>

            {deleteError && (
              <p className="text-red-400 text-sm text-center">
                {deleteError}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  </div>

  {/* Edit Modal */}
  {editMode && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">

      <div className="bg-gray-800 border border-gray-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">

        <h2 className="text-xl font-bold text-white mb-6">
          Edit Profile
        </h2>

        {/* Username */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-300 block mb-1">
            Username
          </label>

          <input
            type="text"
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value)}
            className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b6353a]/30"
            placeholder="Your username"
          />
        </div>

        {/* Avatar URL */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-300 block mb-1">
            Profile Picture URL
          </label>

          <input
            type="text"
            value={editAvatarUrl}
            onChange={(e) => setEditAvatarUrl(e.target.value)}
            className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b6353a]/30"
            placeholder="https://example.com/your-photo.jpg"
          />

          {editAvatarUrl && (
            <img
              src={editAvatarUrl}
              alt="Preview"
              className="w-16 h-16 rounded-full object-cover mt-2 border border-gray-600"
              onError={(e) => (e.target.style.display = "none")}
            />
          )}
        </div>

        {/* Favorite Animes */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-300 block mb-2">
            Favorite Animes ({editFavorites.length}/4)
          </label>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {editFavorites.map((anime) => (
              <div key={anime.mal_id} className="relative group">
                <div
                  className="rounded-lg overflow-hidden bg-gray-700"
                  style={{ aspectRatio: "3/4" }}
                >
                  {anime.image_url && (
                    <img src={anime.image_url} alt={anime.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <button
                  onClick={() => removeFavorite(anime.mal_id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
                <p className="text-xs text-gray-300 line-clamp-1 mt-1">{anime.title}</p>
              </div>
            ))}

            {Array.from({ length: 4 - editFavorites.length }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center"
                style={{ aspectRatio: "3/4" }}
              >
                <span className="text-gray-500 text-xl">+</span>
              </div>
            ))}
          </div>

          {editFavorites.length < 4 && (
            <div className="relative">
              <input
                type="text"
                value={animeSearchQuery}
                onChange={(e) => setAnimeSearchQuery(e.target.value)}
                placeholder="Search to add an anime..."
                className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b6353a]/30"
              />
              {(searchingAnime || animeSearchResults.length > 0) && (
                <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 max-h-52 overflow-y-auto mt-1">
                  {searchingAnime && (
                    <p className="p-3 text-sm text-gray-400">Searching...</p>
                  )}
                  {animeSearchResults.map((anime) => (
                    <button
                      key={anime.mal_id}
                      onClick={() => addFavorite(anime)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-700 text-left transition-colors"
                    >
                      {anime.images?.jpg?.image_url && (
                        <img src={anime.images.jpg.image_url} alt={anime.title} className="w-8 h-11 object-cover rounded" />
                      )}
                      <span className="text-sm text-white">{anime.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {saveError && <p className="text-red-400 text-sm mb-4">{saveError}</p>}

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setEditMode(false)}
            className="px-4 py-2 rounded-lg border border-gray-600 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#b6353a] text-white text-sm font-medium hover:bg-[#9e2d31] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  );
}