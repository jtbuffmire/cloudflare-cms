import { browser } from '$app/environment';

export class WebSocketClient {
  constructor(url = 'ws://localhost:8787/ws') {
    this.url = url;
    this.ws = null;
    this.reconnectTimeout = 1000;
    this.maxReconnectAttempts = 5;
    this.reconnectAttempts = 0;
    /** @type {Map<string, Array<function(any):void>>} */
    this.subscribers = new Map();
    
    if (browser) {
      this.connect();
    }
  }

  connect() {
    try {
      console.log('📡 Connecting to WebSocket...');
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
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
        console.log('📡 WebSocket disconnected');
        this.reconnect();
      });

      this.ws.addEventListener('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.ws?.close();
      });

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      this.reconnect();
    }
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectTimeout * this.reconnectAttempts);
  }

  subscribe(type, handler) {
    console.log('📌 New subscription for:', type);
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
    console.log('🔍 WebSocket raw message received:', event.data);
    const { type, data } = JSON.parse(event.data);
    console.log('🔍 Parsed message:', { type, data });
    
    this.subscribers.get(type)?.forEach(callback => callback(data));
  }
}

export const wsClient = new WebSocketClient(); 