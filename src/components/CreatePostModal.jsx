import { useState } from "react";

export default function CreatePostModal({ onSubmit, onClose }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!title.trim()) { setError("Title is required."); return; }
    if (!body.trim()) { setError("Body is required."); return; }
    setSubmitting(true);
    await onSubmit(title, body);
    setSubmitting(false);
  }

  return (
    <div
      style={{ minHeight: "100vh", background: "rgba(0,0,0,0.6)" }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1f2937] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Create Post</h2>

        <div className="mb-4">
          <label className="text-sm font-semibold text-stone-400 block mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your post a title..."
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#b6353a]/30"
          />
        </div>

        <div className="mb-6">
          <label className="text-sm font-semibold text-stone-400 block mb-1">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your thoughts..."
            rows={5}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#b6353a]/30 resize-none"
          />
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-stone-600 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-[#b6353a] text-white text-sm font-medium hover:bg-[#9e2d31] transition-colors disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}