import { browser } from '$app/environment';

const WS_URL = import.meta.env.DEV 
  ? 'ws://localhost:8787/ws'
  : 'wss://api.buffmire.com/ws';

export class WebSocketClient {
  constructor(url = WS_URL) {
    this.url = url;
    this.ws = null;
    /** @type {Map<string, Array<function(any):void>>} */
    this.subscribers = new Map();
    
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('message', this.handleMessage.bind(this));
      
      // Add logging
      this.ws.addEventListener('open', () => {
        console.log('✅ Blog WebSocket connected');
      });

      // Add reconnection logic
      this.ws.addEventListener('close', () => {
        console.log('🔌 Blog WebSocket closed, attempting reconnect...');
        setTimeout(() => this.connect(), 1000);
      });

      this.ws.addEventListener('error', (error) => {
        console.error('❌ Blog WebSocket error:', error);
      });

    } catch (error) {
      console.error('❌ Blog WebSocket connection failed:', error);
    }
  }

  subscribe(type, handler) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }
    this.subscribers.get(type).push(handler);
    
    return () => this.unsubscribe(type, handler);
  }

  unsubscribe(type, handler) {
    const handlers = this.subscribers.get(type) || [];
    this.subscribers.set(type, handlers.filter(h => h !== handler));
  }

  handleMessage(event) {
    try {
        const { type, data } = JSON.parse(event.data);
        // console.log('📨 Blog received WebSocket message:', { type, data });
        this.subscribers.get(type)?.forEach(callback => callback(data));
    } catch (error) {
        console.error('❌ Failed to handle WebSocket message:', error);
    }
  }
}

export const wsClient = new WebSocketClient(); 