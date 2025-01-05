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
      console.log('🔄 Initializing WebSocket client for:', url);
      this.connect();
    }
  }

  connect() {
    try {
      console.log('📡 Attempting WebSocket connection to:', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', () => {
        console.log('✅ WebSocket connected successfully');
        this.reconnectAttempts = 0;
        // Send a test message to verify connection
        this.ws.send(JSON.stringify({ type: 'HELLO' }));
      });

      this.ws.addEventListener('message', (event) => {
        console.log('📨 [WebSocketClient] Raw message received:', event.data);
        try {
          const message = JSON.parse(event.data);
          console.log('🔔 [WebSocketClient] Parsed message:', {
            type: message.type,
            data: message.data
          });
          
          const handlers = this.subscribers.get(message.type);
          if (handlers?.length) {
            console.log(`📣 [WebSocketClient] Found ${handlers.length} handlers for type:`, message.type);
            handlers.forEach(handler => {
              console.log(`🎯 [WebSocketClient] Executing handler for ${message.type}`);
              handler(message.data);
            });
          } else {
            console.warn(`⚠️ [WebSocketClient] No handlers found for message type:`, message.type);
            console.log(`📝 [WebSocketClient] Current subscribers:`, 
              Array.from(this.subscribers.keys()));
          }
        } catch (err) {
          console.error('❌ [WebSocketClient] Failed to parse message:', err);
          console.log('📄 [WebSocketClient] Raw message was:', event.data);
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