import { wsManager } from '../../lib/websocket'

// ─────────────────────────────────────────────────────────────
// Setup / teardown
// ─────────────────────────────────────────────────────────────

// Minimal WebSocket stub — just enough for connect() tests
class MockWebSocket {
    static instances = []
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3

    constructor(url) {
        this.url = url
        this.readyState = MockWebSocket.CONNECTING
        this.sent = []
        MockWebSocket.instances.push(this)
    }

    send(data) { this.sent.push(data) }

    close(code = 1000, reason = '') {
        this.readyState = MockWebSocket.CLOSED
        this.onclose?.({ code, reason })
    }

    // Test helpers
    _open() {
        this.readyState = MockWebSocket.OPEN
        this.onopen?.()
    }
    _message(data) {
        this.onmessage?.({ data: JSON.stringify(data) })
    }
    _error() {
        this.onerror?.(new Error('WebSocket error'))
    }
}

beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket)
    MockWebSocket.instances = []
    // Reset singleton state
    wsManager.ws = null
    wsManager.listeners = new Map()
    wsManager.reconnectAttempts = 0
    wsManager.isConnecting = false
    if (wsManager.pingInterval) {
        clearInterval(wsManager.pingInterval)
        wsManager.pingInterval = null
    }
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllTimers()
})

// ─────────────────────────────────────────────────────────────
// subscribe / unsubscribe
// ─────────────────────────────────────────────────────────────

describe('subscribe / unsubscribe', () => {
    it('registers a listener for a type', () => {
        const cb = vi.fn()
        wsManager.subscribe('job_progress', cb)
        expect(wsManager.listeners.get('job_progress')).toContain(cb)
    })

    it('returns a working unsubscribe function', () => {
        const cb = vi.fn()
        const unsub = wsManager.subscribe('job_progress', cb)
        unsub()
        expect(wsManager.listeners.get('job_progress')).not.toContain(cb)
    })

    it('supports multiple listeners for the same type', () => {
        const a = vi.fn()
        const b = vi.fn()
        wsManager.subscribe('job_progress', a)
        wsManager.subscribe('job_progress', b)
        wsManager.handleMessage({ type: 'job_progress', job_id: '1', progress: 10 })
        expect(a).toHaveBeenCalledOnce()
        expect(b).toHaveBeenCalledOnce()
    })
})

// ─────────────────────────────────────────────────────────────
// handleMessage
// ─────────────────────────────────────────────────────────────

describe('handleMessage', () => {
    it('dispatches payload (without type) to typed listeners', () => {
        const cb = vi.fn()
        wsManager.subscribe('job_progress', cb)
        wsManager.handleMessage({ type: 'job_progress', job_id: 'abc', progress: 42 })
        expect(cb).toHaveBeenCalledWith({ job_id: 'abc', progress: 42 })
    })

    it('dispatches full message (with type) to "all" listeners', () => {
        const cb = vi.fn()
        wsManager.subscribe('all', cb)
        wsManager.handleMessage({ type: 'job_completed', job_id: 'abc', output_path: '/out.jpg' })
        expect(cb).toHaveBeenCalledWith({ type: 'job_completed', job_id: 'abc', output_path: '/out.jpg' })
    })

    it('silently ignores "ping" messages', () => {
        const cb = vi.fn()
        wsManager.subscribe('ping', cb)
        wsManager.subscribe('all', cb)
        wsManager.handleMessage({ type: 'ping' })
        expect(cb).not.toHaveBeenCalled()
    })

    it('silently ignores "pong" messages', () => {
        const cb = vi.fn()
        wsManager.subscribe('pong', cb)
        wsManager.handleMessage({ type: 'pong' })
        expect(cb).not.toHaveBeenCalled()
    })

    it('does not throw when there are no listeners for a type', () => {
        expect(() => {
            wsManager.handleMessage({ type: 'unknown_type', data: 'x' })
        }).not.toThrow()
    })
})

// ─────────────────────────────────────────────────────────────
// watchJob
// ─────────────────────────────────────────────────────────────

describe('watchJob', () => {
    it('calls onProgress for the watched job', () => {
        const onProgress = vi.fn()
        wsManager.watchJob('job-123', onProgress, null, null)
        wsManager.handleMessage({ type: 'job_progress', job_id: 'job-123', progress: 75 })
        expect(onProgress).toHaveBeenCalledWith(75)
    })

    it('ignores progress updates for other jobs', () => {
        const onProgress = vi.fn()
        wsManager.watchJob('job-123', onProgress, null, null)
        wsManager.handleMessage({ type: 'job_progress', job_id: 'job-456', progress: 75 })
        expect(onProgress).not.toHaveBeenCalled()
    })

    it('calls onComplete for the watched job', () => {
        const onComplete = vi.fn()
        wsManager.watchJob('job-123', null, onComplete, null)
        wsManager.handleMessage({ type: 'job_completed', job_id: 'job-123', output_path: '/out.jpg', processing_time: 2.5 })
        expect(onComplete).toHaveBeenCalledWith('/out.jpg', 2.5)
    })

    it('calls onError for the watched job', () => {
        const onError = vi.fn()
        wsManager.watchJob('job-123', null, null, onError)
        wsManager.handleMessage({ type: 'job_failed', job_id: 'job-123', error: 'Out of memory' })
        expect(onError).toHaveBeenCalledWith('Out of memory')
    })

    it('removes all listeners when unsubscribe is called', () => {
        const onProgress = vi.fn()
        const onComplete = vi.fn()
        const onError = vi.fn()
        const unsub = wsManager.watchJob('job-123', onProgress, onComplete, onError)

        unsub()

        wsManager.handleMessage({ type: 'job_progress', job_id: 'job-123', progress: 50 })
        wsManager.handleMessage({ type: 'job_completed', job_id: 'job-123', output_path: '/x.jpg', processing_time: 1 })
        wsManager.handleMessage({ type: 'job_failed', job_id: 'job-123', error: 'fail' })

        expect(onProgress).not.toHaveBeenCalled()
        expect(onComplete).not.toHaveBeenCalled()
        expect(onError).not.toHaveBeenCalled()
    })
})

// ─────────────────────────────────────────────────────────────
// connect / disconnect
// ─────────────────────────────────────────────────────────────

describe('connect', () => {
    it('creates a WebSocket instance', () => {
        wsManager.connect('test-jwt-token')
        expect(MockWebSocket.instances).toHaveLength(1)
    })

    it('sends auth message on open', () => {
        wsManager.connect('my-token')
        const ws = MockWebSocket.instances[0]
        ws._open()
        expect(ws.sent).toHaveLength(1)
        const msg = JSON.parse(ws.sent[0])
        expect(msg).toEqual({ type: 'auth', token: 'my-token' })
    })

    it('does not reconnect when already open', () => {
        wsManager.connect('tok')
        const ws = MockWebSocket.instances[0]
        ws._open()
        // readyState is OPEN — second connect should be a no-op
        wsManager.connect('tok')
        expect(MockWebSocket.instances).toHaveLength(1)
    })
})

describe('disconnect', () => {
    it('sets ws to null and clears listeners', () => {
        const cb = vi.fn()
        wsManager.subscribe('job_progress', cb)
        wsManager.connect('tok')
        wsManager.disconnect()
        expect(wsManager.ws).toBeNull()
        expect(wsManager.listeners.size).toBe(0)
    })
})

describe('isConnected', () => {
    it('returns false when no WebSocket exists', () => {
        expect(wsManager.isConnected()).toBe(false)
    })

    it('returns true when WebSocket is OPEN', () => {
        wsManager.connect('tok')
        const ws = MockWebSocket.instances[0]
        ws._open()
        expect(wsManager.isConnected()).toBe(true)
    })
})

// ─────────────────────────────────────────────────────────────
// Reconnect logic
// ─────────────────────────────────────────────────────────────

describe('reconnect', () => {
    it('stops after maxReconnectAttempts', () => {
        vi.useFakeTimers()
        wsManager.reconnectAttempts = wsManager.maxReconnectAttempts  // already at limit
        wsManager.attemptReconnect()
        // No timeout should be scheduled
        expect(wsManager.reconnectAttempts).toBe(wsManager.maxReconnectAttempts)
        vi.useRealTimers()
    })
})
