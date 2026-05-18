import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/AuthContext'

// ─────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────

vi.mock('../../lib/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}))

vi.mock('../../lib/websocket', () => ({
    wsManager: {
        connect: vi.fn(),
        disconnect: vi.fn(),
    },
    useWebSocket: vi.fn(),
}))

import api from '../../lib/axios'
import { wsManager } from '../../lib/websocket'

// ─────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

const MOCK_USER = { email: 'user@test.com', role: 'USER', credits: 10, is_active: true }

beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()

    // Default: system-info always succeeds; /auth/me fails (unauthenticated)
    api.get.mockImplementation((url) => {
        if (url === '/auth/system-info') return Promise.resolve({ data: { cuda_available: false } })
        if (url === '/auth/me') return Promise.reject(Object.assign(new Error('Unauthorized'), { response: { status: 401 } }))
        return Promise.reject(new Error(`Unexpected GET: ${url}`))
    })
    api.post.mockResolvedValue({ data: {} })
})

// ─────────────────────────────────────────────────────────────
// Provider guard
// ─────────────────────────────────────────────────────────────

describe('useAuth guard', () => {
    it('throws when called outside AuthProvider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider')
        spy.mockRestore()
    })
})

// ─────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────

describe('initial state', () => {
    // React 19 flushes synchronous effects during renderHook, so when there is no
    // stored token the else-branch runs synchronously and loading becomes false
    // immediately.  We verify the final stable state instead of a transient one.
    it('resolves to loading = false when there is no stored token', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))
    })

    it('user is null when there is no stored token', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.user).toBeNull()
    })

    it('exposes systemInfo from /auth/system-info', async () => {
        api.get.mockImplementation((url) => {
            if (url === '/auth/system-info') return Promise.resolve({ data: { cuda_available: true } })
            if (url === '/auth/me') return Promise.reject(Object.assign(new Error('401'), { response: { status: 401 } }))
        })
        const { result } = renderHook(() => useAuth(), { wrapper })
        // system-info is fetched async in its own effect — wait for it directly
        await waitFor(() => expect(result.current.systemInfo.cuda_available).toBe(true))
    })
})

// ─────────────────────────────────────────────────────────────
// Token verification on mount
// ─────────────────────────────────────────────────────────────

describe('token verification on mount', () => {
    it('sets user from /auth/me when a token exists in localStorage', async () => {
        localStorage.setItem('token', 'stored-token')
        api.get.mockImplementation((url) => {
            if (url === '/auth/system-info') return Promise.resolve({ data: { cuda_available: false } })
            if (url === '/auth/me') return Promise.resolve({ data: MOCK_USER })
        })

        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.user).toEqual(MOCK_USER)
    })

    it('connects WebSocket after successful token verification', async () => {
        localStorage.setItem('token', 'stored-token')
        api.get.mockImplementation((url) => {
            if (url === '/auth/system-info') return Promise.resolve({ data: { cuda_available: false } })
            if (url === '/auth/me') return Promise.resolve({ data: MOCK_USER })
        })

        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(wsManager.connect).toHaveBeenCalledWith('stored-token')
    })

    it('clears state and disconnects WebSocket when token is invalid', async () => {
        localStorage.setItem('token', 'bad-token')
        // /auth/me returns 401 — already the default mock

        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.user).toBeNull()
        expect(localStorage.getItem('token')).toBeNull()
        expect(wsManager.disconnect).toHaveBeenCalled()
    })
})

// ─────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────

describe('login', () => {
    it('sets user and stores token on success', async () => {
        // /auth/me must succeed after login triggers the token-verification effect
        api.get.mockImplementation((url) => {
            if (url === '/auth/system-info') return Promise.resolve({ data: { cuda_available: false } })
            if (url === '/auth/me') return Promise.resolve({ data: MOCK_USER })
        })
        api.post.mockResolvedValueOnce({
            data: { access_token: 'new-token', user: MOCK_USER },
        })

        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        await act(async () => {
            await result.current.login('user@test.com', 'password123')
        })

        await waitFor(() => expect(result.current.user).toEqual(MOCK_USER))
        expect(localStorage.getItem('token')).toBe('new-token')
    })

    it('throws when credentials are wrong', async () => {
        api.post.mockRejectedValueOnce(
            Object.assign(new Error('Invalid credentials'), { response: { status: 401 } })
        )

        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        await expect(
            act(async () => { await result.current.login('x@test.com', 'wrong') })
        ).rejects.toThrow()
    })
})

// ─────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────

describe('register', () => {
    it('sets user and stores token on success', async () => {
        const newUser = { email: 'new@test.com', role: 'USER', credits: 10 }
        // /auth/me must succeed after register triggers the token-verification effect
        api.get.mockImplementation((url) => {
            if (url === '/auth/system-info') return Promise.resolve({ data: { cuda_available: false } })
            if (url === '/auth/me') return Promise.resolve({ data: newUser })
        })
        api.post.mockResolvedValueOnce({
            data: { access_token: 'reg-token', user: newUser },
        })

        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        await act(async () => {
            await result.current.register('new@test.com', 'password123')
        })

        await waitFor(() => expect(result.current.user).toEqual(newUser))
        expect(localStorage.getItem('token')).toBe('reg-token')
    })
})

// ─────────────────────────────────────────────────────────────
// logout
// ─────────────────────────────────────────────────────────────

describe('logout', () => {
    it('clears user, token, and disconnects WebSocket', async () => {
        localStorage.setItem('token', 'active-token')
        api.get.mockImplementation((url) => {
            if (url === '/auth/system-info') return Promise.resolve({ data: { cuda_available: false } })
            if (url === '/auth/me') return Promise.resolve({ data: MOCK_USER })
        })
        api.post.mockResolvedValue({ data: {} })

        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.user).toEqual(MOCK_USER))

        await act(async () => {
            await result.current.logout()
        })

        expect(result.current.user).toBeNull()
        expect(localStorage.getItem('token')).toBeNull()
        expect(wsManager.disconnect).toHaveBeenCalled()
    })

    it('calls server-side logout endpoint', async () => {
        localStorage.setItem('token', 'active-token')
        api.get.mockImplementation((url) => {
            if (url === '/auth/system-info') return Promise.resolve({ data: { cuda_available: false } })
            if (url === '/auth/me') return Promise.resolve({ data: MOCK_USER })
        })

        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.user).toEqual(MOCK_USER))

        await act(async () => {
            await result.current.logout()
        })

        expect(api.post).toHaveBeenCalledWith('/auth/logout')
    })

    it('still clears state even when server-side logout fails', async () => {
        localStorage.setItem('token', 'active-token')
        api.get.mockImplementation((url) => {
            if (url === '/auth/system-info') return Promise.resolve({ data: { cuda_available: false } })
            if (url === '/auth/me') return Promise.resolve({ data: MOCK_USER })
        })
        api.post.mockRejectedValue(new Error('Network error'))

        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.user).toEqual(MOCK_USER))

        await act(async () => {
            await result.current.logout()
        })

        expect(result.current.user).toBeNull()
        expect(localStorage.getItem('token')).toBeNull()
    })
})
