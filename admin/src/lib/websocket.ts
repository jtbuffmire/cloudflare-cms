import { browser } from '$app/environment';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number = 1000;
  private subscribers: Map<string, Array<(data: any) => void>> = new Map();
  
  constructor(private url: string = 'ws://localhost:8787/ws') {
    if (browser) {
      this.connect();
    }
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener('open', () => {
        console.log('✅ WebSocket connected');
      this.reconnectTimeout = 1000;
    });

    this.ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);        
        const handlers = this.subscribers.get(message.type) || [];
        handlers.forEach(handler => handler(message.data));
      } catch (err) {
        console.error('❌ Failed to parse WebSocket message:', err);
      }
    });

    this.ws.addEventListener('close', () => {
      console.log('🔌 WebSocket disconnected, reconnecting...');
      setTimeout(() => {
        this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000);
        this.connect();
      }, this.reconnectTimeout);
    });

    this.ws.addEventListener('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  public subscribe(type: string, handler: (data: any) => void) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }
    this.subscribers.get(type)?.push(handler);
    return () => this.unsubscribe(type, handler);
  }

  private unsubscribe(type: string, handler: (data: any) => void) {
    const handlers = this.subscribers.get(type) || [];
    this.subscribers.set(type, handlers.filter(h => h !== handler));
  }

  public close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const wsClient = new WebSocketClient();