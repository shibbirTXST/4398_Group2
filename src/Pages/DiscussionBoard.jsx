import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PostCard from "../components/PostCard";
import CreatePostModal from "../components/CreatePostModal";
import bgImage from "../assets/generalbackground.png"; // adjust path as needed


export default function DiscussionBoard() {
  const { id } = useParams();
  const isGlobal = !id;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [animeTitles, setAnimeTitles] = useState({});

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      let query = supabase
        .from("discussion_posts")
        .select("*, profiles(username)")
        .order("created_at", { ascending: false });

      if (!isGlobal) {
        query = query.eq("anime_id", parseInt(id));
      }

      const { data, error } = await query;
      if (!error) setPosts(data || []);
      setLoading(false);
    }

    load();
  }, [id, isGlobal]);

  // Fetch anime titles for global board
  useEffect(() => {
    if (!isGlobal) return;
    const ids = [...new Set(posts.map((p) => p.anime_id).filter(Boolean))];
    ids.forEach(async (animeId) => {
      if (animeTitles[animeId]) return;
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${animeId}`);
        const json = await res.json();
        setAnimeTitles((prev) => ({ ...prev, [animeId]: json.data?.title }));
      } catch {
        setAnimeTitles((prev) => ({ ...prev, [animeId]: `Anime #${animeId}` }));
      }
    });
  }, [posts, isGlobal]);

  async function handleCreatePost(title, body) {
    console.log("Attempting insert with:", {
      user_id: currentUser?.id,
      anime_id: isGlobal ? null : parseInt(id),
      title: title.trim(),
      body: body.trim(),
    });

    const { data: insertData, error: insertError } = await supabase
      .from("discussion_posts")
      .insert({
        user_id: currentUser.id,
        anime_id: isGlobal ? null : parseInt(id),
        title: title.trim(),
        body: body.trim(),
      });

    console.log("Insert result:", insertData, insertError);

    if (insertError) {
      console.error("Insert error:", insertError.message);
      alert("Failed to post: " + insertError.message);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    let query = supabase
      .from("discussion_posts")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false });

    if (!isGlobal) {
      query = query.eq("anime_id", parseInt(id));
    }

    const { data, error: fetchError } = await query;

    console.log("Fetch result:", data, fetchError);

    if (fetchError) {
      console.error("Fetch error:", fetchError.message);
      alert("Failed to fetch posts: " + fetchError.message);
      return;
    }

    setPosts(data || []);
    setShowCreateModal(false);
  }

  return (
  <div
  className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed px-6 py-10"
  style={{ backgroundImage: `url(${bgImage})` }}
>
  <div className="max-w-4xl mx-auto bg-gray-800/90 rounded-2xl border border-gray-600 px-6 py-10">
    {/* Header */}
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {isGlobal ? "Global Discussion Board" : "Anime Discussion Board"}
        </h1>
        <p className="text-gray-300 text-sm mt-1">
          {isGlobal
            ? "Discussions from all animes"
            : `Discussions for this anime`}
        </p>
      </div>

      {currentUser ? (
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2 rounded-full bg-[#b6353a] text-white text-sm font-medium border border-[#d55a5f] hover:bg-[#9e2d31] transition-colors"
        >
          Create Post
        </button>
      ) : (
        <Link
          to="/signin"
          className="px-5 py-2 rounded-full border border-[#b6353a] text-[#ffb4b8] text-sm font-medium hover:bg-[#b6353a]/20 transition-colors"
        >
          Log in to post
        </Link>
      )}
    </div>

    {/* Posts */}
    {loading ? (
      <p className="text-gray-300">Loading posts...</p>
    ) : posts.length === 0 ? (
      <div className="text-center py-20 bg-gray-700/60 border border-gray-600 rounded-xl">
        <p className="text-gray-200 text-lg">No posts yet.</p>
        <p className="text-gray-400 text-sm mt-1">
          Be the first to start a discussion!
        </p>
      </div>
    ) : (
      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-gray-700/70 border border-gray-600 rounded-xl p-4"
          >
            <PostCard
              post={post}
              currentUser={currentUser}
              animeTitle={animeTitles[post.anime_id]}
              showAnimeLabel={isGlobal}
            />
          </div>
        ))}
      </div>
    )}
  </div>

  {showCreateModal && (
    <CreatePostModal
      onSubmit={handleCreatePost}
      onClose={() => setShowCreateModal(false)}
    />
  )}
</div>
  );
}