import type { 
  DurableObjectState,
  WebSocket as CFWebSocket,
  Response as CFResponse,
  Request as CFRequest
} from '@cloudflare/workers-types';
import type { Env } from '../types';

interface WebSocketMessage {
  type: string;
  domain?: string;
  data?: any;
}

export class WebSocketHandler {
  private sessions: Map<string, Set<CFWebSocket>>;
  private state: DurableObjectState;
  private env: Env;
  private lastMessages: Map<string, string>; // Store last message per domain

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.lastMessages = new Map();
  }

  // Helper to check if message is duplicate
  private isDuplicateMessage(domain: string, message: WebSocketMessage): boolean {
    const messageKey = `${domain}:${message.type}`;
    const messageString = JSON.stringify(message.data);
    const lastMessage = this.lastMessages.get(messageKey);
    
    if (lastMessage === messageString) {
      console.log(`🔄 Duplicate message detected for ${domain}:`, message.type);
      return true;
    }

    // Store new message
    this.lastMessages.set(messageKey, messageString);
    
    // Cleanup old messages if map gets too large
    if (this.lastMessages.size > 1000) {
      const keys = Array.from(this.lastMessages.keys());
      for (let i = 0; i < keys.length - 100; i++) {
        this.lastMessages.delete(keys[i]);
      }
    }
    
    return false;
  }

  async fetch(request: CFRequest): Promise<CFResponse> {
    const url = new URL(request.url);

    // Handle WebSocket connections
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 }) as unknown as CFResponse;
      }

      // Get domain from query parameter
      const domain = url.searchParams.get('domain');
      if (!domain) {
        console.log('❌ Missing domain parameter in WebSocket connection');
        return new Response('Missing domain parameter', { status: 400 }) as unknown as CFResponse;
      }

      // Create WebSocket pair
      const pair = new WebSocketPair();
      await this.handleSession(pair[1] as unknown as CFWebSocket, domain);
      
      return new Response(null, {
        status: 101,
        webSocket: pair[0],
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      }) as unknown as CFResponse;
    }

    // Handle broadcast requests
    if (url.pathname === '/broadcast') {
      const message = await request.json() as WebSocketMessage;
      // Try to get domain from multiple sources in order of precedence
      const domain = message.domain || 
                     message.data?.domain || 
                     request.headers.get('X-Site-Domain');
      
      if (!domain) {
        console.log('❌ Missing domain parameter in broadcast');
        return new Response('Missing domain parameter', { status: 400 }) as unknown as CFResponse;
      }

      // Check for duplicate message
      if (this.isDuplicateMessage(domain, message)) {
        return new Response(JSON.stringify({
          success: true,
          domain,
          skipped: true,
          reason: 'duplicate'
        }), {
          headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
      }

      // Ensure domain is included in both the top level and data object of the broadcast message
      const broadcastMessage = {
        ...message,
        domain,
        data: {
          ...message.data,
          domain
        }
      };

      console.log(`📢 Broadcasting message to domain ${domain}:`, broadcastMessage);
      
      const domainSessions = this.sessions.get(domain) || new Set();
      let successCount = 0;
      let failureCount = 0;

      domainSessions.forEach(session => {
        try {
          session.send(JSON.stringify(broadcastMessage));
          successCount++;
        } catch (err) {
          console.error(`Failed to send to session for domain ${domain}:`, err);
          failureCount++;
        }
      });
      
      return new Response(JSON.stringify({
        success: true,
        domain,
        data: message.data,
        stats: {
          total: domainSessions.size,
          success: successCount,
          failure: failureCount
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    return new Response('Not found', { status: 404 }) as unknown as CFResponse;
  }

  private async handleSession(webSocket: CFWebSocket, domain: string) {
    // Initialize domain sessions if not exists
    if (!this.sessions.has(domain)) {
      this.sessions.set(domain, new Set());
    }
    
    // Add session to domain
    const domainSessions = this.sessions.get(domain)!;
    domainSessions.add(webSocket);
    
    // Send welcome message
    webSocket.accept();
    webSocket.send(JSON.stringify({ 
      type: 'connected',
      domain,
      sessionCount: domainSessions.size
    }));

    // Handle messages
    webSocket.addEventListener('message', async event => {
      try {
        const data = JSON.parse(event.data as string) as WebSocketMessage;
        // console.log(`📩 WebSocket message received for domain ${domain}:`, data);
        
        if (data.type === 'ping') {
          webSocket.send(JSON.stringify({ type: 'pong', domain }));
        }
      } catch (err) {
        console.error(`WebSocket message error for domain ${domain}:`, err);
        webSocket.send(JSON.stringify({ 
          type: 'error',
          message: 'Invalid message format',
          domain 
        }));
      }
    });

    // Handle close
    webSocket.addEventListener('close', () => {
      console.log(`🔌 WebSocket closed for domain ${domain}`);
      domainSessions.delete(webSocket);
      if (domainSessions.size === 0) {
        this.sessions.delete(domain);
      }
    });

    // Handle errors
    webSocket.addEventListener('error', err => {
      console.error(`❌ WebSocket error for domain ${domain}:`, err);
      domainSessions.delete(webSocket);
      if (domainSessions.size === 0) {
        this.sessions.delete(domain);
      }
    });
  }
}