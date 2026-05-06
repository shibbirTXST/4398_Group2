import { useEffect, useState, useRef } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useNavigate, useSearchParams } from "react-router-dom";
import { getGenresFromMood } from "../../services/aiService";

// import ExploreControls from "./ExploreControls";
// import AnimeSection from "./AnimeSection";


export default function MoodBot() {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [isThinking, setIsThinking] = useState(false)
    const [messages, setMessages] = useState([
        { role: "assistant", content: "Hi! I'm MoodBot. Tell me what kind of mood you're in and I'll recommend some anime!" }
    ])

    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isThinking])

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        const userText = query;
        setQuery("");

        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsThinking(true);

        try {
            // Grab the payload
            const aiPayload = await getGenresFromMood(userText);
            console.log("AI returned:", aiPayload);

            // Build the API URL using ONLY the primary genre
            const primaryGenre = aiPayload.genres[0];
            // Give the illusion of infinite anime by randomizing the page
            const randomPage = Math.floor(Math.random() * 20) + 1;

            const response = await fetch(`https://api.jikan.moe/v4/anime?genres=${primaryGenre}&page=${randomPage}&limit=15&order_by=score&sort=desc`);
            const data = await response.json();

            // Jikan API doesn't natively filter out sequels
            const sequelKeywords = ["season 2", "season 3", "season 4", "season 5", "season 6", "2nd season", "3rd season", "4th season", "5th season", "part 2", "part 3", "part ii", "part iii"];
            
            const filteredAnime = (data.data || []).filter(anime => {
                const title = (anime.title_english || anime.title || "").toLowerCase();
                return !sequelKeywords.some(keyword => title.includes(keyword));
            });

            // Take the top 3 from our filtered list
            const top3Anime = filteredAnime.slice(0, 3);

            // Map over the anime objects to extract titles
            const titles = top3Anime.map(anime => anime.title_english || anime.title);

            // Fallback in case Jikan doesn't find anything
            if (titles.length === 0) {
                setMessages(prev => [...prev, { role: 'assistant', content: `${aiPayload.friendly_message}\n\nHmm, I tried to find some anime for that mood but couldn't find any exact matches. Try exploring the main page!` }]);
                return;
            }

            // Combine the AI's natural message with the anime titles
            const botResponse = `${aiPayload.friendly_message}\n\nHere are some recommendations to get you started:\n- ${titles.join('\n- ')}`;

            // Push to chat
            setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble understanding you. Try rephrasing your request." }]);
        } finally {
            setIsThinking(false);
        }
    }

    return (
        <div>
            <button
                onClick={() => setOpen(true)}
                className="rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#fefcf4] px-2 py-0.5 text-sm text-black">
                    MoodBot
                </div>
            </button>

            <Dialog open={open} onClose={setOpen} className="fixed inset-0 z-50">
                <DialogBackdrop
                    transition
                    className="inset-0 bg-gray-900/50 transition-opacity duration-500 ease-in-out data-closed:opacity-0"
                />
                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
                            <DialogPanel
                                transition
                                className="pointer-events-auto relative w-screen max-w-sm transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700"
                            >
                                <div className="relative flex h-full flex-col bg-slate-950 py-4 shadow-xl">
                                    <div className="px-4 border-b border-slate-800 pb-3 flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setOpen(false)}
                                            className="rounded-md text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                                        >
                                            <span className="sr-only">Close panel</span>
                                            <XMarkIcon aria-hidden="true" className="size-6 transition-colors" />
                                        </button>
                                        <DialogTitle className="text-xl font-bold text-white relative top-[1px]">MoodBot</DialogTitle>
                                    </div>
                                    {/* chatbot ui */}
                                    <div className="relative flex flex-1 flex-col overflow-hidden px-4 pt-4">
                                        <div className="flex-1 overflow-y-auto pr-2">
                                            {messages.map((msg, index) => (
                                                <div key={index} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <span className={`inline-block rounded-2xl px-3 py-1.5 max-w-[80%] whitespace-pre-wrap shadow-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'}`}>
                                                        {msg.content}
                                                    </span>
                                                </div>
                                            ))}
                                            {isThinking && (
                                                <div className="mb-4 flex justify-start">
                                                    <div className="inline-flex rounded-2xl px-4 py-3 bg-slate-800 border border-slate-700 rounded-bl-none items-center space-x-1.5 animate-pulse shadow-sm">
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        <div className="mt-4 pt-2">
                                            <form
                                                onSubmit={handleChatSubmit}
                                                className="flex gap-2"
                                            >
                                                <input
                                                    type="text"
                                                    value={query}
                                                    onChange={(e) => setQuery(e.target.value)}
                                                    placeholder="Type your mood..."
                                                    className="flex-1 rounded-full bg-slate-900 border border-slate-700 px-4 py-1.5 text-purple-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
                                                />
                                                <button
                                                    type="submit"
                                                    className="rounded-full bg-purple-600 hover:bg-purple-500 px-4 py-1.5 text-white font-medium shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-slate-950"
                                                >
                                                    Send
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </DialogPanel>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    )

}