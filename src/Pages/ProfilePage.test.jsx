import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ProfilePage from './ProfilePage'

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

vi.mock('../services/jikanApi', () => ({
  searchAnime: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { supabase } from '../supabaseClient'
import { searchAnime } from '../services/jikanApi'

function mockSupabaseChain(returnValue) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
    update: vi.fn().mockReturnThis(),
  }
  return chain
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
}

const mockProfile = {
  id: 'user-123',
  username: 'TestUser',
  avatar_url: null,
  favorite_animes: [],
}

const mockReviews = [
  {
    id: 'review-1',
    anime_id: 1,
    rating: 9,
    review_text: 'Amazing anime!',
    created_at: '2026-04-01T00:00:00Z',
    anime_title: 'Fullmetal Alchemist',
  },
]

function renderProfilePage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

  supabase.from.mockImplementation((table) => {
    if (table === 'profiles') {
      return mockSupabaseChain({ data: mockProfile, error: null })
    }
    if (table === 'anime_ratings') {
      return mockSupabaseChain({ data: mockReviews, error: null })
    }
    return mockSupabaseChain({ data: null, error: null })
  })

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ data: { title: 'Fullmetal Alchemist' } }),
  }))
})

describe('ProfilePage', () => {

  describe('Profile display', () => {
    it('shows loading state initially', () => {
      supabase.auth.getUser.mockReturnValue(new Promise(() => {}))
      renderProfilePage()
      expect(screen.getByText('Loading profile...')).toBeInTheDocument()
    })

    it('redirects to signin if no user is logged in', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })
      renderProfilePage()
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/signin')
      })
    })

    it('displays the username after loading', async () => {
      renderProfilePage()
      await waitFor(() => {
        expect(screen.getByText('TestUser')).toBeInTheDocument()
      })
    })

    it('displays the user email after loading', async () => {
      renderProfilePage()
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })
    })

    it('displays section headings', async () => {
      renderProfilePage()
      await waitFor(() => {
        expect(screen.getByText('Top Favorite Animes')).toBeInTheDocument()
        expect(screen.getByText('Most Recent Reviews')).toBeInTheDocument()
      })
    })

    it('shows Edit Profile button', async () => {
      renderProfilePage()
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument()
      })
    })
  })

  describe('Favorite animes', () => {
    it('shows empty favorites message when no favorites set', async () => {
      renderProfilePage()
      await waitFor(() => {
        expect(
          screen.getByText('No favorites set yet. Edit your profile to add some!')
        ).toBeInTheDocument()
      })
    })

    it('displays favorite anime titles when favorites exist', async () => {
      const profileWithFavorites = {
        ...mockProfile,
        favorite_animes: [
          { mal_id: 1, title: 'Naruto', image_url: 'https://example.com/naruto.jpg' },
          { mal_id: 2, title: 'Bleach', image_url: 'https://example.com/bleach.jpg' },
        ],
      }

      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return mockSupabaseChain({ data: profileWithFavorites, error: null })
        }
        return mockSupabaseChain({ data: mockReviews, error: null })
      })

      renderProfilePage()
      await waitFor(() => {
        expect(screen.getByText('Naruto')).toBeInTheDocument()
        expect(screen.getByText('Bleach')).toBeInTheDocument()
      })
    })
  })

  describe('Recent reviews', () => {
    it('shows no reviews message when there are no reviews', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return mockSupabaseChain({ data: mockProfile, error: null })
        }
        if (table === 'anime_ratings') {
          return mockSupabaseChain({ data: [], error: null })
        }
        return mockSupabaseChain({ data: null, error: null })
      })

      renderProfilePage()
      await waitFor(() => {
        expect(screen.getByText('No reviews yet.')).toBeInTheDocument()
      })
    })

    it('displays review rating badge', async () => {
      renderProfilePage()
      await waitFor(() => {
        expect(screen.getByText('9/10')).toBeInTheDocument()
      })
    })

    it('displays review text', async () => {
      renderProfilePage()
      await waitFor(() => {
        expect(screen.getByText('Amazing anime!')).toBeInTheDocument()
      })
    })
  })

  describe('Edit profile modal', () => {
    it('opens edit modal when Edit Profile is clicked', async () => {
      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))
      expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument()
    })

    it('closes modal when Cancel is clicked', async () => {
      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Cancel'))
      await waitFor(() => {
        expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
      })
    })

    it('pre-fills username field with current username', async () => {
      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))
      const input = screen.getByPlaceholderText('Your username')
      expect(input.value).toBe('TestUser')
    })

    it('allows typing a new username', async () => {
      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))
      const input = screen.getByPlaceholderText('Your username')
      fireEvent.change(input, { target: { value: 'NewUsername' } })
      expect(input.value).toBe('NewUsername')
    })

    it('saves profile when Save Changes is clicked', async () => {
      const chain = mockSupabaseChain({ data: mockProfile, error: null })
      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') return chain
        return mockSupabaseChain({ data: mockReviews, error: null })
      })

      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(chain.update).toHaveBeenCalled()
      })
    })

    it('shows anime search results when typing in favorites search', async () => {
      searchAnime.mockResolvedValue([
        { mal_id: 5, title: 'One Piece', images: { jpg: { image_url: 'https://example.com/op.jpg' } } },
      ])

      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))

      const searchInput = screen.getByPlaceholderText('Search to add an anime...')
      fireEvent.change(searchInput, { target: { value: 'One Piece' } })

      await waitFor(() => {
        expect(screen.getByText('One Piece')).toBeInTheDocument()
      })
    })

    it('shows 4 slots in the favorites picker', async () => {
      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))
      const plusSigns = screen.getAllByText('+')
      expect(plusSigns).toHaveLength(4)
    })
  })

  describe('Username change', () => {
    it('updates displayed username after saving', async () => {
      const chain = mockSupabaseChain({ data: mockProfile, error: null })
      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') return chain
        return mockSupabaseChain({ data: mockReviews, error: null })
      })

      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))

      const input = screen.getByPlaceholderText('Your username')
      fireEvent.change(input, { target: { value: 'CoolNewName' } })
      fireEvent.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(chain.update).toHaveBeenCalledWith(
          expect.objectContaining({ username: 'CoolNewName' })
        )
      })
    })

    it('trims whitespace from username before saving', async () => {
      const chain = mockSupabaseChain({ data: mockProfile, error: null })
      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') return chain
        return mockSupabaseChain({ data: mockReviews, error: null })
      })

      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))

      const input = screen.getByPlaceholderText('Your username')
      fireEvent.change(input, { target: { value: '  SpacedName  ' } })
      fireEvent.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(chain.update).toHaveBeenCalledWith(
          expect.objectContaining({ username: 'SpacedName' })
        )
      })
    })

    it('does not close modal if save fails', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
        update: vi.fn().mockReturnThis(),
      }
      chain.eq.mockReturnValueOnce({
        ...chain,
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Save failed' },
        }),
      })

      supabase.from.mockImplementation(() => chain)

      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })
    })
  })

  describe('Profile picture change', () => {
    it('allows typing a new avatar URL', async () => {
      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))

      const input = screen.getByPlaceholderText('https://example.com/your-photo.jpg')
      fireEvent.change(input, { target: { value: 'https://example.com/newavatar.jpg' } })
      expect(input.value).toBe('https://example.com/newavatar.jpg')
    })

    it('saves the new avatar URL when Save Changes is clicked', async () => {
      const chain = mockSupabaseChain({ data: mockProfile, error: null })
      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') return chain
        return mockSupabaseChain({ data: mockReviews, error: null })
      })

      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))

      const input = screen.getByPlaceholderText('https://example.com/your-photo.jpg')
      fireEvent.change(input, { target: { value: 'https://example.com/newavatar.jpg' } })
      fireEvent.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(chain.update).toHaveBeenCalledWith(
          expect.objectContaining({ avatar_url: 'https://example.com/newavatar.jpg' })
        )
      })
    })

    it('saves null when avatar URL is cleared', async () => {
      const chain = mockSupabaseChain({ data: mockProfile, error: null })
      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') return chain
        return mockSupabaseChain({ data: mockReviews, error: null })
      })

      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))

      const input = screen.getByPlaceholderText('https://example.com/your-photo.jpg')
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(chain.update).toHaveBeenCalledWith(
          expect.objectContaining({ avatar_url: null })
        )
      })
    })

    it('shows a preview image when a valid URL is entered', async () => {
      renderProfilePage()
      await waitFor(() => screen.getByText('Edit Profile'))
      fireEvent.click(screen.getByText('Edit Profile'))

      const input = screen.getByPlaceholderText('https://example.com/your-photo.jpg')
      fireEvent.change(input, { target: { value: 'https://example.com/newavatar.jpg' } })

      await waitFor(() => {
        const preview = screen.getByAltText('Preview')
        expect(preview).toBeInTheDocument()
        expect(preview).toHaveAttribute('src', 'https://example.com/newavatar.jpg')
      })
    })
  })

})