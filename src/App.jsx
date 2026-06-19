import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import ProfilePage from './Pages/ProfilePage'
import './App.css'

import Signup from './components/Signup'
import LoginForm from './components/loginForm'
import Dashboard from './Pages/Dashboard'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import AnimeDetails from "./Pages/AnimeDetails";
import AnimeEpisodes from './Pages/AnimeEpisodes'
import SearchResults from './Pages/SearchResults'
import Navbar from './components/NavBar'
import ExplorePage from "./Pages/ExplorePage";
import ForYouPage from "./Pages/ForYouPage";

import DiscussionBoard from './Pages/DiscussionBoard'
import WatchList from './Pages/WatchList'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/signin" />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Signup />} />
        <Route path="/signin" element={user ? <Navigate to="/dashboard" /> : <LoginForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={user
          ? <Dashboard logout={() => supabase.auth.signOut()} />
          : <Navigate to="/signin" />
        } />
        <Route path="/anime/:id" element={<AnimeDetails />} />
        <Route path="/anime/:id/episodes" element={<AnimeEpisodes />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/watchlist" element={<WatchList />} />
        <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/signin" />} />
        <Route path="/foryou" element={<ForYouPage />} />
        <Route path="/discussions" element={<DiscussionBoard />} />
        <Route path="/anime/:id/discussions" element={<DiscussionBoard />} />
      </Routes>
    </div>

  )
}

export default App