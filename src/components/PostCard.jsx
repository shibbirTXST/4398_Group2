import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

export default function PostCard({ post, currentUser, animeTitle, showAnimeLabel }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadReplies() {
    if (repliesLoaded) { setShowReplies(!showReplies); return; }
    const { data, error } = await supabase
      .from("discussion_replies")
      .select("*, profiles(username)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (!error) {
      setReplies(data || []);
      setRepliesLoaded(true);
      setShowReplies(true);
    }
  }

  async function submitReply() {
    if (!replyText.trim() || !currentUser) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("discussion_replies")
      .insert({
        post_id: post.id,
        user_id: currentUser.id,
        body: replyText.trim(),
      })
      .select("*, profiles(username)")
      .single();

    if (!error && data) {
      setReplies((prev) => [...prev, data]);
      setReplyText("");
      setShowReplies(true);
      setRepliesLoaded(true);
    }
    setSubmitting(false);
  }

  const isOwn = currentUser && post.user_id === currentUser.id;

  return (
    <div className={`rounded-xl border px-5 py-4 transition-all ${isOwn ? "border-[#b6353a]/50 bg-[#1f2937]" : "border-stone-700 bg-[#1f2937]"}`}>

      {/* Anime label (global board only) */}
      {showAnimeLabel && post.anime_id && (
        <Link
          to={`/anime/${post.anime_id}`}
          className="text-xs text-[#b6353a] font-medium mb-2 block hover:underline"
        >
          {animeTitle || `Anime #${post.anime_id}`}
        </Link>
      )}
      {showAnimeLabel && !post.anime_id && (
        <span className="text-xs text-stone-500 font-medium mb-2 block">General</span>
      )}

      {/* Post header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <h3 className="text-white font-bold text-base">{post.title}</h3>
        {isOwn && (
          <span className="text-xs bg-[#b6353a]/20 text-[#b6353a] px-2 py-0.5 rounded-full shrink-0">
            Your post
          </span>
        )}
      </div>

      {/* Post body */}
      <p className="text-stone-300 text-sm mb-3">{post.body}</p>

      {/* Post meta */}
      <div className="flex items-center gap-3 text-xs text-stone-500 mb-4">
        <span>{post.profiles?.username || "Unknown"}</span>
        <span>·</span>
        <span>
          {new Date(post.created_at).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
          })}
        </span>
      </div>

      {/* Reply toggle */}
      <button
        onClick={loadReplies}
        className="text-xs text-stone-400 hover:text-white transition-colors mb-3"
      >
        {showReplies ? "Hide replies" : `Replies${replies.length > 0 ? ` (${replies.length})` : ""}`}
      </button>

      {/* Replies */}
      {showReplies && (
        <div className="ml-4 border-l border-stone-700 pl-4">
          {replies.length === 0 ? (
            <p className="text-stone-500 text-xs mb-3">No replies yet.</p>
          ) : (
            <div className="flex flex-col gap-3 mb-3">
              {replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                    <span className="text-stone-300 font-medium">
                      {reply.profiles?.username || "Unknown"}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(reply.created_at).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-stone-300">{reply.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          {currentUser ? (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#b6353a]/30"
                onKeyDown={(e) => e.key === "Enter" && submitReply()}
              />
              <button
                onClick={submitReply}
                disabled={submitting || !replyText.trim()}
                className="px-3 py-1.5 bg-[#b6353a] text-white text-sm rounded-lg hover:bg-[#9e2d31] transition-colors disabled:opacity-40"
              >
                Reply
              </button>
            </div>
          ) : (
            <p className="text-xs text-stone-500">
              <Link to="/signin" className="text-[#b6353a] hover:underline">Log in</Link> to reply
            </p>
          )}
        </div>
      )}
    </div>
  );
}