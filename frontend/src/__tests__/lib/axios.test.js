import axios from 'axios'
import api from '../../lib/axios'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Build a minimal JWT with given exp (Unix seconds). */
function makeJwt(exp) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    const payload = btoa(JSON.stringify({ sub: 'user@test.com', exp }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return `${header}.${payload}.fake_signature`
}

const VALID_TOKEN = makeJwt(Math.floor(Date.now() / 1000) + 3600)   // +1 h
const EXPIRED_TOKEN = makeJwt(Math.floor(Date.now() / 1000) - 3600) // -1 h

// ─────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────

let originalAdapter

beforeEach(() => {
    localStorage.clear()
    originalAdapter = api.defaults.adapter

    // Default mock adapter — returns 200 OK for any request
    api.defaults.adapter = vi.fn().mockResolvedValue({
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
    })
})

afterEach(() => {
    api.defaults.adapter = originalAdapter
    localStorage.clear()
    vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────
// Request interceptor — Authorization header
// ─────────────────────────────────────────────────────────────

describe('request interceptor', () => {
    it('adds Authorization header when a valid token is in localStorage', async () => {
        localStorage.setItem('token', VALID_TOKEN)

        await api.get('/test')

        const config = api.defaults.adapter.mock.calls[0][0]
        expect(config.headers.Authorization).toBe(`Bearer ${VALID_TOKEN}`)
    })

    it('does not add Authorization header when no token exists', async () => {
        await api.get('/test')

        const config = api.defaults.adapter.mock.calls[0][0]
        expect(config.headers.Authorization).toBeUndefined()
    })

    it('rejects request and clears token when token is expired', async () => {
        localStorage.setItem('token', EXPIRED_TOKEN)

        await expect(api.get('/test')).rejects.toThrow('Token expired')
        expect(localStorage.getItem('token')).toBeNull()
        // Adapter should NOT have been called because interceptor short-circuited
        expect(api.defaults.adapter).not.toHaveBeenCalled()
    })

    it('does not force application/json Content-Type for FormData requests', async () => {
        localStorage.setItem('token', VALID_TOKEN)

        const formData = new FormData()
        formData.append('file', new Blob(['x'], { type: 'image/jpeg' }), 'x.jpg')

        await api.post('/upload', formData)

        const config = api.defaults.adapter.mock.calls[0][0]
        // The interceptor removes 'Content-Type: application/json' so the browser
        // (or jsdom) can set the correct multipart/form-data boundary.
        // We verify the header is NOT the JSON default.
        expect(config.headers['Content-Type']).not.toBe('application/json')
    })
})

// ─────────────────────────────────────────────────────────────
// Response interceptor — 401 handling
// ─────────────────────────────────────────────────────────────

describe('response interceptor', () => {
    it('clears token on 401 for non-auth endpoints', async () => {
        localStorage.setItem('token', VALID_TOKEN)

        const err = new axios.AxiosError(
            'Unauthorized',
            'ERR_BAD_REQUEST',
            { url: '/jobs' },
            null,
            { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config: { url: '/jobs' } }
        )
        api.defaults.adapter = vi.fn().mockRejectedValue(err)

        await expect(api.get('/jobs')).rejects.toBeDefined()
        expect(localStorage.getItem('token')).toBeNull()
    })

    it('does NOT clear token on 401 for /auth/login', async () => {
        localStorage.setItem('token', VALID_TOKEN)

        const err = new axios.AxiosError(
            'Unauthorized',
            'ERR_BAD_REQUEST',
            { url: '/auth/login' },
            null,
            { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config: { url: '/auth/login' } }
        )
        api.defaults.adapter = vi.fn().mockRejectedValue(err)

        await expect(api.post('/auth/login', {})).rejects.toBeDefined()
        // Token must NOT be cleared for auth endpoints
        expect(localStorage.getItem('token')).toBe(VALID_TOKEN)
    })

    it('does NOT clear token on 401 for /auth/register', async () => {
        localStorage.setItem('token', VALID_TOKEN)

        const err = new axios.AxiosError(
            'Unauthorized',
            'ERR_BAD_REQUEST',
            { url: '/auth/register' },
            null,
            { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config: { url: '/auth/register' } }
        )
        api.defaults.adapter = vi.fn().mockRejectedValue(err)

        await expect(api.post('/auth/register', {})).rejects.toBeDefined()
        expect(localStorage.getItem('token')).toBe(VALID_TOKEN)
    })

    it('passes through non-401 errors unchanged', async () => {
        const err = new axios.AxiosError(
            'Not Found',
            'ERR_BAD_REQUEST',
            { url: '/jobs/xyz' },
            null,
            { data: {}, status: 404, statusText: 'Not Found', headers: {}, config: { url: '/jobs/xyz' } }
        )
        api.defaults.adapter = vi.fn().mockRejectedValue(err)

        await expect(api.get('/jobs/xyz')).rejects.toBeDefined()
        // localStorage should be untouched
        expect(localStorage.getItem('token')).toBeNull()
    })
})
