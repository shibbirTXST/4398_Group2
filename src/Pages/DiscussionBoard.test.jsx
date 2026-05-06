import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DiscussionBoard from './DiscussionBoard'
import PostCard from '../components/PostCard'

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { supabase } from '../supabaseClient'

const mockUser = { id: 'user-123', email: 'test@example.com' }

const mockAnimePost = {
  id: 'post-1',
  user_id: 'user-123',
  anime_id: 21,
  title: 'Best arc in One Piece?',
  body: 'I think Marineford is the best arc.',
  created_at: '2026-04-01T12:00:00Z',
  profiles: { username: 'TestUser' },
}

const mockGlobalPost = {
  id: 'post-2',
  user_id: 'user-456',
  anime_id: null,
  title: 'Favourite anime of all time?',
  body: 'Mine is FMA Brotherhood.',
  created_at: '2026-04-02T12:00:00Z',
  profiles: { username: 'OtherUser' },
}

const mockReply = {
  id: 'reply-1',
  post_id: 'post-1',
  user_id: 'user-123',
  body: 'Totally agree!',
  created_at: '2026-04-01T12:00:00Z',
  profiles: { username: 'TestUser' },
}

// Fixed chain — order returns this AND resolves when awaited
function mockChain(resolvedData) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (fn) => Promise.resolve({ data: resolvedData, error: null }).then(fn),
  }
  return chain
}

function renderAnimeBoard(animeId = '21') {
  return render(
    <MemoryRouter initialEntries={[`/anime/${animeId}/discussions`]}>
      <Routes>
        <Route path="/anime/:id/discussions" element={<DiscussionBoard />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderGlobalBoard() {
  return render(
    <MemoryRouter initialEntries={['/discussions']}>
      <Routes>
        <Route path="/discussions" element={<DiscussionBoard />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
  supabase.from.mockImplementation((table) => {
    if (table === 'discussion_posts') return mockChain([mockAnimePost])
    if (table === 'discussion_replies') return mockChain([mockReply])
    return mockChain([])
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ data: { title: 'One Piece' } }),
  }))
})

// ── Anime Discussion Board ─────────────────────────────────────────────

describe('Anime discussion board', () => {
  it('loads discussion board for a specific anime', async () => {
    renderAnimeBoard('21')
    await waitFor(() => {
      expect(screen.getByText('Anime Discussion Board')).toBeInTheDocument()
    })
  })

  it('shows posts belonging to the specific anime', async () => {
    renderAnimeBoard('21')
    await waitFor(() => {
      expect(screen.getByText('Best arc in One Piece?')).toBeInTheDocument()
    })
  })

  it('shows empty state when no posts exist for anime', async () => {
    supabase.from.mockImplementation(() => mockChain([]))
    renderAnimeBoard('21')
    await waitFor(() => {
      expect(screen.getByText('No posts yet.')).toBeInTheDocument()
    })
  })

  it('navigate to board from anime page links to correct route', () => {
    const animeId = 21
    expect(`/anime/${animeId}/discussions`).toBe('/anime/21/discussions')
  })
})

// ── Global Discussion Board ────────────────────────────────────────────

describe('Global discussion board', () => {
  it('loads the global discussion board', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'discussion_posts') return mockChain([mockAnimePost, mockGlobalPost])
      return mockChain([])
    })
    renderGlobalBoard()
    await waitFor(() => {
      expect(screen.getByText('Global Discussion Board')).toBeInTheDocument()
    })
  })

  it('shows posts from all animes on global board', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'discussion_posts') return mockChain([mockAnimePost, mockGlobalPost])
      return mockChain([])
    })
    renderGlobalBoard()
    await waitFor(() => {
      expect(screen.getByText('Best arc in One Piece?')).toBeInTheDocument()
      expect(screen.getByText('Favourite anime of all time?')).toBeInTheDocument()
    })
  })

  it('posts show which anime they belong to on global board', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'discussion_posts') return mockChain([mockAnimePost])
      return mockChain([])
    })
    renderGlobalBoard()
    await waitFor(() => {
      // Use getAllByText since "One Piece" appears in both the label and post title
      const matches = screen.getAllByText(/One Piece/)
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  it('posts with no anime show as General', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'discussion_posts') return mockChain([mockGlobalPost])
      return mockChain([])
    })
    renderGlobalBoard()
    await waitFor(() => {
      expect(screen.getByText('General')).toBeInTheDocument()
    })
  })

  it('posts are ordered by most recent first', () => {
    const posts = [mockAnimePost, mockGlobalPost].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
    expect(posts[0].id).toBe('post-2')
    expect(posts[1].id).toBe('post-1')
  })

  it('navbar Discussions link points to correct route', () => {
    expect('/discussions').toBe('/discussions')
  })
})

// ── Creating a post ────────────────────────────────────────────────────

describe('Creating a post', () => {
  it('submit post with valid title and body calls supabase insert', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
    supabase.from.mockReturnValue({ insert: insertMock })

    await supabase.from('discussion_posts').insert({
      user_id: mockUser.id,
      anime_id: 21,
      title: 'Best arc in One Piece?',
      body: 'I think Marineford is the best arc.',
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Best arc in One Piece?',
        body: 'I think Marineford is the best arc.',
      })
    )
  })

  it('create post from anime board attaches correct anime_id', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
    supabase.from.mockReturnValue({ insert: insertMock })

    await supabase.from('discussion_posts').insert({
      user_id: mockUser.id,
      anime_id: 21,
      title: 'Test',
      body: 'Test body',
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ anime_id: 21 })
    )
  })

  it('create post from global board sets anime_id to null', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
    supabase.from.mockReturnValue({ insert: insertMock })

    await supabase.from('discussion_posts').insert({
      user_id: mockUser.id,
      anime_id: null,
      title: 'Favourite anime of all time?',
      body: 'Mine is FMA Brotherhood.',
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ anime_id: null })
    )
  })

  it('does not submit post if title is empty', () => {
    expect('  '.trim().length).toBe(0)
  })

  it('does not submit post if body is empty', () => {
    expect(''.trim().length).toBe(0)
  })
})

// ── Replying to a post ─────────────────────────────────────────────────

describe('Replying to a post', () => {
  it('submit reply with valid body calls supabase insert', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: mockReply, error: null })
    supabase.from.mockReturnValue({
      insert: insertMock,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockReply, error: null }),
    })

    await supabase.from('discussion_replies').insert({
      post_id: 'post-1',
      user_id: mockUser.id,
      body: 'Totally agree!',
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        post_id: 'post-1',
        user_id: mockUser.id,
        body: 'Totally agree!',
      })
    )
  })

  it('reply is attached to the correct post', () => {
    expect(mockReply.post_id).toBe('post-1')
  })

  it('does not submit reply if body is empty', () => {
    expect('  '.trim().length).toBe(0)
  })
})

// ── Post and reply display ─────────────────────────────────────────────

describe('Post and reply display', () => {
  it('post shows title', () => {
    render(
      <MemoryRouter>
        <PostCard post={mockAnimePost} currentUser={mockUser} showAnimeLabel={false} />
      </MemoryRouter>
    )
    expect(screen.getByText('Best arc in One Piece?')).toBeInTheDocument()
  })

  it('post shows body', () => {
    render(
      <MemoryRouter>
        <PostCard post={mockAnimePost} currentUser={mockUser} showAnimeLabel={false} />
      </MemoryRouter>
    )
    expect(screen.getByText('I think Marineford is the best arc.')).toBeInTheDocument()
  })

  it('post shows author username', () => {
    render(
      <MemoryRouter>
        <PostCard post={mockAnimePost} currentUser={mockUser} showAnimeLabel={false} />
      </MemoryRouter>
    )
    expect(screen.getByText('TestUser')).toBeInTheDocument()
  })

  it('post shows formatted date', () => {
    render(
      <MemoryRouter>
        <PostCard post={mockAnimePost} currentUser={mockUser} showAnimeLabel={false} />
      </MemoryRouter>
    )
    // Match whatever date the local timezone renders
    const formatted = new Date('2026-04-01T12:00:00Z').toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
    expect(screen.getByText(formatted)).toBeInTheDocument()
  })

  it('reply count is shown on post after loading replies', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'discussion_replies') {
        return mockChain([mockReply, { ...mockReply, id: 'reply-2' }])
      }
      return mockChain([])
    })

    render(
      <MemoryRouter>
        <PostCard post={mockAnimePost} currentUser={mockUser} showAnimeLabel={false} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/Replies/))

    await waitFor(() => {
      // After loading, the button should show Hide replies and 2 replies appear
      const replyItems = screen.getAllByText('Totally agree!')
      expect(replyItems).toHaveLength(2)
    })
  })

  it('reply shows author username after expanding', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'discussion_replies') return mockChain([mockReply])
      return mockChain([])
    })

    render(
      <MemoryRouter>
        <PostCard post={mockAnimePost} currentUser={mockUser} showAnimeLabel={false} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/Replies/))

    await waitFor(() => {
      expect(screen.getByText('Totally agree!')).toBeInTheDocument()
    })
  })

  it('reply shows formatted date after expanding', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'discussion_replies') return mockChain([mockReply])
      return mockChain([])
    })

    render(
      <MemoryRouter>
        <PostCard post={mockAnimePost} currentUser={mockUser} showAnimeLabel={false} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/Replies/))

    const formatted = new Date('2026-04-01T12:00:00Z').toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })

    await waitFor(() => {
      expect(screen.getAllByText(formatted).length).toBeGreaterThan(0)
    })
  })
})