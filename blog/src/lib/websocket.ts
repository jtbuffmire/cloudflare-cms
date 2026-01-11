import { browser } from '$app/environment';
import { WS_BASE } from './config';

export interface WebSocketMessage {
  type: string;
  data: any;
  domain?: string;
}

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private url: string;
    private domain: string | null = null;
    private connectionTimeout: number = 10000; // 10 seconds
    private pingInterval: number = 30000; // 30 seconds
    private pingTimer: NodeJS.Timeout | null = null;
    public onMessage: ((message: WebSocketMessage) => void) | null = null;

    constructor(url?: string, domain?: string) {
        this.url = url || `${WS_BASE}/ws`;
        if (browser) {
            // Only access window.location in browser environment
            this.domain = (domain || window.location.hostname).split(':')[0];
        } else {
            this.domain = domain || 'localhost';
        }
    }

    public connect() {
        if (!browser || !this.domain) {
            // Don't attempt connection in SSR or if domain is not set
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        const wsUrl = new URL(this.url);
        wsUrl.searchParams.set('domain', this.domain);

        try {
            // Clear any existing connection
            this.cleanup();

            // Create new connection
            this.ws = new WebSocket(wsUrl.toString());

            // Set connection timeout
            const connectionTimeoutId = setTimeout(() => {
                if (this.ws?.readyState !== WebSocket.OPEN) {
                    console.error('❌ WebSocket connection timeout');
                    this.cleanup();
                    
                    // Only attempt reconnect if we haven't reached max attempts
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        this.reconnectDelay *= 2; // Exponential backoff
                        setTimeout(() => this.connect(), this.reconnectDelay);
                    }
                }
            }, this.connectionTimeout);

            this.ws.addEventListener('open', () => {
                clearTimeout(connectionTimeoutId);
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                this.startPingInterval();
            });

            this.ws.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data) as WebSocketMessage;
                    
                    if (this.onMessage) {
                        this.onMessage(data);
                    } else {
                        switch (data.type) {
                            case 'connected':
                                break;
                            case 'pong':
                                break;
                            case 'echo':
                                break;
                            case 'error':
                                console.error('❌ Server error:', data.data);
                                break;
                            default:
                                // Silently ignore unknown message types
                        }
                    }
                } catch (err) {
                    console.error('❌ Failed to parse WebSocket message:', err);
                }
            });

            this.ws.addEventListener('close', () => {
                this.cleanup();

                // Only attempt reconnect if we haven't reached max attempts
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    setTimeout(() => {
                        this.reconnectAttempts++;
                        this.reconnectDelay *= 2; // Exponential backoff
                        this.connect();
                    }, this.reconnectDelay);
                }
            });

            this.ws.addEventListener('error', () => {
                // Error handling - connection will close and trigger reconnect
            });

        } catch (err) {
            console.error('❌ Failed to create WebSocket:', err);
            this.cleanup();
        }
    }

    private cleanup() {
        if (this.ws) {
            this.ws.close(1000, 'Client closing connection');
            this.ws = null;
        }
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    private startPingInterval() {
        this.pingTimer = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.send({ type: 'ping' });
            }
        }, this.pingInterval);
    }

    public send(data: any) {
        if (!browser) {
            // Don't attempt to send in SSR
            return;
        }
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('❌ WebSocket not connected');
        }
    }

    public close() {
        this.cleanup();
    }
}

// Create and export a singleton instance
export const websocket = new WebSocketClient();

// Only connect in the browser
if (browser) {
    websocket.connect();
} 