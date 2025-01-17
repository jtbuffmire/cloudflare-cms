import { API_BASE } from './config';
import { browser } from '$app/environment';

// Convert API URL to WebSocket URL
const wsBase = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://');
const WS_URL = `${wsBase}/ws`;

// Message types for WebSocket communication
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
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  public onMessage: ((message: WebSocketMessage) => void) | null = null;

  constructor() {
    if (browser) {
      this.setupPing();
    }
  }

  public connect(): void {
    if (!browser) return;

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    const hostname = window.location.hostname;
    // For production admin panel (admin.buffmire.com), use main domain (buffmire.com)
    const domain = hostname.startsWith('admin.') ? hostname.replace('admin.', '') : hostname;
    
    const url = new URL(WS_URL);
    url.searchParams.set('domain', domain);
    url.searchParams.set('site', hostname);

    this.ws = new WebSocket(url.toString());

    this.ws.addEventListener('open', this.handleOpen.bind(this));
    this.ws.addEventListener('message', this.handleMessage.bind(this));
    this.ws.addEventListener('close', this.handleClose.bind(this));
    this.ws.addEventListener('error', this.handleError.bind(this));

    // Set connection timeout
    this.connectionTimeout = setTimeout(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        console.log('⏰ WebSocket connection timeout');
        this.ws?.close();
      }
    }, 5000);
  }

  private handleOpen(): void {
    console.log('🔌 WebSocket connected');
    this.reconnectAttempts = 0;
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      // console.log('📨 Received message:', message);
      if (this.onMessage) {
        this.onMessage(message);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('🔌 WebSocket closed:', event.code, event.reason);
    this.cleanup();
    this.reconnect();
  }

  private handleError(event: Event): void {
    console.error('❌ WebSocket error:', event);
    this.cleanup();
    this.reconnect();
  }

  private reconnect(): void {
    if (!browser) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('⚠️ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private cleanup(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.ws) {
      this.ws.removeEventListener('open', this.handleOpen.bind(this));
      this.ws.removeEventListener('message', this.handleMessage.bind(this));
      this.ws.removeEventListener('close', this.handleClose.bind(this));
      this.ws.removeEventListener('error', this.handleError.bind(this));
      this.ws = null;
    }
  }

  private setupPing(): void {
    if (!browser) return;

    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000);
  }

  public send(data: any): void {
    if (!browser) return;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }
}

// Export singleton instance
export const websocket = new WebSocketClient(); 