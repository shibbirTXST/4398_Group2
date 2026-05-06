import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { searchAnime } from "../services/jikanApi";
import { supabase } from '../supabaseClient';
// import MoodBot from './explore/MoodBot';
import MoodBot from './explore/MoodBot';

const NavBar = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [animeResults, setAnimeResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");

    useEffect(() => {
        const delay = setTimeout(() => {
            async function fetchAnime() {
                if (!query.trim()) {
                    setAnimeResults([]);
                    setSearchError("");
                    return;
                }
                try {
                    setSearchLoading(true);
                    setSearchError("");
                    const results = await searchAnime(query);
                    setAnimeResults(results);
                } catch (err) {
                    setSearchError(err.message);
                } finally {
                    setSearchLoading(false);
                }
            }
            fetchAnime();
        }, 400);

        return () => clearTimeout(delay);
    }, [query]);

    const [avatarUrl, setAvatarUrl] = useState(
        "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"
    );

    useEffect(() => {
        async function fetchAvatar() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from("profiles")
                .select("avatar_url")
                .eq("id", user.id)
                .single();
            if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        }
        fetchAvatar();
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && query.trim() !== '') {
            const searchQuery = query.trim();
            setQuery(""); // Clear the input to close the dropdown
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <nav className="sticky top-0 z-50 w-full bg-[#fefcf4]/80 backdrop-blur-xl border-b border-[#f5f4eb]">
            <div className="flex items-center justify-start gap-5 h-14 max-w-[1440px] mx-auto px-8">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tighter text-[#b6353a]">
                        AniMood
                    </span>
                </div>

                {/* Navigation Links */}
                <div className="flex items-center gap-4">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => `text-sm pb-1 transition-colors ${isActive ? "font-bold text-[#b6353a] border-b-2 border-[#b6353a]" : "font-medium text-stone-600 hover:text-[#b6353a]"}`}
                    >
                        Home
                    </NavLink>
                    <NavLink
                        to="/watchlist"
                        className={({ isActive }) => `text-sm pb-1 transition-colors ${isActive ? "font-bold text-[#b6353a] border-b-2 border-[#b6353a]" : "font-medium text-stone-600 hover:text-[#b6353a]"}`}
                    >
                        Watchlist
                    </NavLink>
                    <NavLink
                        to="/explore"
                        className={({ isActive }) => `text-sm pb-1 transition-colors ${isActive ? "font-bold text-[#b6353a] border-b-2 border-[#b6353a]" : "font-medium text-stone-600 hover:text-[#b6353a]"}`}
                    >
                        Explore
                    </NavLink>
                    <NavLink
                        to="/discussions"
                        className={({ isActive }) => `text-sm pb-1 transition-colors ${isActive ? "font-bold text-[#b6353a] border-b-2 border-[#b6353a]" : "font-medium text-stone-600 hover:text-[#b6353a]"}`}
                    >
                        Discussions
                    </NavLink>
                    {/* <NavLink
                        to="/placeholder"
                        className={({ isActive }) => `text-sm pb-1 transition-colors ${isActive ? "font-bold text-[#b6353a] border-b-2 border-[#b6353a]" : "font-medium text-stone-600 hover:text-[#b6353a]"}`}
                    >
                        Placeholder
                    </NavLink> */}
                </div>

                {/* Action Icons & Profile */}
                <div className="flex items-center ml-auto gap-6">
                    <div className="flex relative group">

                        <input
                            type="text"
                            placeholder="Search anime..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="bg-[#f5f4eb] text-black border-none rounded-full py-1.5 px-4 pl-9 text-xs focus:ring-2 focus:ring-[#b6353a]/20 w-56 transition-all"
                        />
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>

                        {/* Search Results Dropdown */}
                        {query.trim() !== "" && (
                            <div className="absolute top-12 left-0 w-80 bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden z-50">
                                {searchLoading && <div className="p-4 text-sm text-stone-500">Searching...</div>}
                                {searchError && <div className="p-4 text-sm text-red-500">{searchError}</div>}
                                {!searchLoading && !searchError && animeResults.length === 0 && (
                                    <div className="p-4 text-sm text-stone-500">No results found.</div>
                                )}
                                {!searchLoading && animeResults.length > 0 && (
                                    <div className="max-h-96 overflow-y-auto">
                                        {animeResults.map((anime) => (
                                            <Link
                                                key={anime.mal_id}
                                                to={`/anime/${anime.mal_id}`}
                                                onClick={() => setQuery('')}
                                                className="flex gap-3 p-3 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0"
                                            >
                                                {anime.images?.jpg?.image_url ? (
                                                    <img src={anime.images.jpg.image_url} alt={anime.title} className="w-10 h-14 object-cover rounded bg-stone-200 shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-14 rounded bg-stone-200 shrink-0" />
                                                )}
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-sm font-bold text-stone-800 truncate">{anime.title}</span>
                                                    <span className="text-xs text-stone-500 line-clamp-2 mt-0.5">{anime.synopsis || "No synopsis available."}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {/* <button className="rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[2px]">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#fefcf4] px-2 py-0.5 text-sm text-black">
                            MoodBot
                        </div>
                    </button> */}
                    <MoodBot />
                    <Link to="/profile">
                        <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#b6353a] transition-all">
                            <img
                                src={avatarUrl}
                                alt="User profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;