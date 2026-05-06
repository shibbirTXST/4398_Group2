import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import bgImage from "../assets/generalbackground.png"; // adjust path as needed


export default function WatchList() {
  const [user, setUser] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const statusOptions = [
    { value: "plan_to_watch", label: "Plan to Watch" },
    { value: "watching", label: "Watching" },
    { value: "completed", label: "Completed" },
    { value: "dropped", label: "Dropped" },
  ];

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log("USER:", user);
      if (userError) console.error("User error:", userError);

      setUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("watchlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      console.log("WATCHLIST DATA:", data);
      if (error) console.error("Watchlist error:", error);

      setWatchlist(data || []);
      setLoading(false);
    }

    loadData();
  }, []);

  async function updateStatus(itemId, newStatus) {
  try {
    console.log("Updating status:", { itemId, newStatus });

    const { data, error } = await supabase
      .from("watchlists")
      .update({ status: newStatus })
      .eq("id", itemId)
      .select();

    if (error) throw error;

    console.log("Updated rows:", data);

    setWatchlist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    );

    console.log("Current auth user id:", user?.id);

  } catch (err) {
    console.error("Status update error:", err);
    alert(err.message || "Failed to update status.");
  }
}

  async function removeFromWatchlist(itemId) {
    try {
      const { error } = await supabase
        .from("watchlists")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setWatchlist((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      console.error("Remove error:", err);
      alert(err.message || "Failed to remove item.");
    }
  }

  if (loading) {
    return <p>Loading watchlist...</p>;
  }

  return (
    <div
  className="min-h-screen w-full bg-center bg-cover bg-no-repeat bg-fixed py-10 px-6"
  style={{ backgroundImage: `url(${bgImage})` }}
>
  <div className="max-w-5xl mx-auto bg-gray-800/90 rounded-2xl shadow-lg p-6 md:p-8">
    <h1 className="text-3xl font-bold text-white text-center mb-6">
      Watchlist
    </h1>

    {!user && (
      <p className="text-center text-white text-lg">
        Login to See Watchlist
      </p>
    )}

    {user && watchlist.length === 0 && (
      <div className="text-center">
        <p className="text-white mb-4">Watchlist is empty.</p>
        <Link to="/explore">
          <button className="px-6 py-3 rounded-full bg-gray-300/90 hover:bg-gray-200 text-black font-semibold shadow-md transition">
            Start Adding to Watchlist
          </button>
        </Link>
      </div>
    )}

    <div className="flex flex-col gap-4">
      {watchlist.map((item) => (
        <div
          key={item.id}
          className="flex flex-col md:flex-row gap-5 md:gap-6 bg-gray-700/70 rounded-xl p-4"
        >
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-[140px] h-[200px] object-cover rounded-lg shadow-md flex-shrink-0 mx-auto md:mx-0"
            />
          )}

          <div className="flex-1 flex flex-col justify-center text-left min-w-0">
            <h2 className="text-white text-xl font-semibold mb-2">
              {item.title}
            </h2>

            <p className="text-gray-300 text-sm mb-2">
              ID: {item.anime_id}
            </p>

            <p className="mb-3">
              <Link
                to={`/anime/${item.anime_id}`}
                className="text-blue-300 hover:underline font-medium"
              >
                View Details
              </Link>
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <label className="text-white font-medium">Status:</label>
              <select
                value={item.status}
                onChange={(e) => updateStatus(item.id, e.target.value)}
                className="text-black bg-white rounded-md px-3 py-2 outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                onClick={() => removeFromWatchlist(item.id)}
                className="px-5 py-2 rounded-full bg-red-400/90 hover:bg-red-300 text-black font-semibold shadow-md transition"
              >
                Remove from Watchlist
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
  );
}