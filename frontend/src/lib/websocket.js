/**
 * WebSocket Manager for Real-time Job Updates
 * Polling yerine WebSocket ile anlık bildirim alır.
 */

class WebSocketManager {
    constructor() {
        this.ws = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.pingInterval = null;
        this.isConnecting = false;
    }

    /**
     * Connect to WebSocket server
     * @param {string} token - JWT token for authentication
     */
    connect(token) {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        this._token = token;
        // Use current window location for WS (works via Vite proxy or direct)
        const apiBase = import.meta.env.VITE_API_URL || '';
        let wsUrl;
        if (apiBase) {
            const wsProtocol = apiBase.startsWith('https') ? 'wss' : 'ws';
            const wsHost = apiBase.replace(/^https?:\/\//, '');
            wsUrl = `${wsProtocol}://${wsHost}/ws/jobs`;
        } else {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            wsUrl = `${wsProtocol}://${window.location.host}/ws/jobs`;
        }

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                // Authenticate via first message instead of URL parameter
                this.ws.send(JSON.stringify({ type: 'auth', token }));
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.startPingInterval();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            this.ws.onclose = (event) => {
                this.isConnecting = false;
                this.stopPingInterval();
                
                // Auto-reconnect if not intentionally closed
                if (event.code !== 1000 && event.code !== 4001) {
                    this.attemptReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
            };

        } catch (e) {
            console.error('Failed to create WebSocket:', e);
            this.isConnecting = false;
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.stopPingInterval();
        if (this.ws) {
            this.ws.close(1000, 'User disconnect');
            this.ws = null;
        }
        this.listeners.clear();
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        setTimeout(() => {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                this.connect(currentToken);
            }
        }, delay);
    }

    /**
     * Start ping interval to keep connection alive
     */
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 25000); // Ping every 25 seconds
    }

    /**
     * Stop ping interval
     */
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Handle incoming WebSocket message
     */
    handleMessage(data) {
        const { type, ...payload } = data;

        // Handle pong (keepalive response)
        if (type === 'pong' || type === 'ping') {
            return;
        }

        // Notify all listeners for this message type
        const typeListeners = this.listeners.get(type) || [];
        typeListeners.forEach(callback => {
            try {
                callback(payload);
            } catch (e) {
                console.error('Error in WebSocket listener:', e);
            }
        });

        // Also notify 'all' listeners
        const allListeners = this.listeners.get('all') || [];
        allListeners.forEach(callback => {
            try {
                callback({ type, ...payload });
            } catch (e) {
                console.error('Error in WebSocket listener:', e);
            }
        });
    }

    /**
     * Subscribe to a specific message type
     * @param {string} type - Message type (job_progress, job_completed, job_failed, all)
     * @param {function} callback - Callback function
     * @returns {function} Unsubscribe function
     */
    subscribe(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(type);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }

    /**
     * Subscribe to job progress updates
     * @param {string} jobId - Job ID to watch
     * @param {function} onProgress - Progress callback (progress: number)
     * @param {function} onComplete - Completion callback (outputPath: string, processingTime: number)
     * @param {function} onError - Error callback (error: string)
     * @returns {function} Unsubscribe function
     */
    watchJob(jobId, onProgress, onComplete, onError) {
        const unsubProgress = this.subscribe('job_progress', (data) => {
            if (data.job_id === jobId && onProgress) {
                onProgress(data.progress);
            }
        });

        const unsubComplete = this.subscribe('job_completed', (data) => {
            if (data.job_id === jobId && onComplete) {
                onComplete(data.output_path, data.processing_time);
            }
        });

        const unsubError = this.subscribe('job_failed', (data) => {
            if (data.job_id === jobId && onError) {
                onError(data.error);
            }
        });

        // Return combined unsubscribe function
        return () => {
            unsubProgress();
            unsubComplete();
            unsubError();
        };
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
export const wsManager = new WebSocketManager();

// React hook for WebSocket
export function useWebSocket() {
    return wsManager;
}
