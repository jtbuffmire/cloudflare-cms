import { browser } from '$app/environment';

export class WebSocketClient {
  constructor(url = 'ws://localhost:8787/ws') {
    this.url = url;
    this.ws = null;
    this.reconnectTimeout = 1000;
    /** @type {Map<string, Array<function(any):void>>} */
    this.subscribers = new Map();
    
    if (browser) {
      this.connect();
    }
  }

  connect() {
    if (!browser) return;

    this.ws = new WebSocket(this.url);

    this.ws.addEventListener('open', () => {
      console.log('✅ WebSocket connected');
      this.reconnectTimeout = 1000;
    });

    this.ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('🔔 WebSocket message received:', message);
        
        const handlers = this.subscribers.get(message.type) || [];
        handlers.forEach(handler => handler(message.data));
      } catch (err) {
        console.error('❌ Failed to parse WebSocket message:', err);
      }
    });

    this.ws.addEventListener('close', () => {
      console.log('📡 WebSocket disconnected, reconnecting...');
      setTimeout(() => {
        this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000);
        this.connect();
      }, this.reconnectTimeout);
    });

    this.ws.addEventListener('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  /**
   * @param {string} type
   * @param {function(any):void} handler
   */
  subscribe(type, handler) {
    const handlers = this.subscribers.get(type) || [];
    this.subscribers.set(type, [...handlers, handler]);
    return () => {
      const handlers = this.subscribers.get(type) || [];
      this.subscribers.set(type, handlers.filter(h => h !== handler));
    };
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const wsClient = new WebSocketClient(); 