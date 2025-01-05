export class WebSocketHandler implements DurableObject {
  private sessions: Set<WebSocket>;
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const { 0: client, 1: server } = new WebSocketPair();
      await this.handleSession(server);
      
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
    }

    if (url.pathname === '/broadcast') {
      const message = await request.json();
      console.log('📢 [WebSocketHandler] Received broadcast request:', {
        pathname: url.pathname,
        message
      });
      this.broadcast(message);
      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleSession(ws: WebSocket) {
    console.log('🔌 New WebSocket connection');
    this.sessions.add(ws);
    ws.accept();
    
    ws.addEventListener('message', async (msg) => {
      if (msg.data === 'ping') return; // Ignore ping messages
      
      try {
        if (typeof msg.data === 'string') {
          const data = JSON.parse(msg.data);
          // Broadcast to all connected clients
          this.broadcast(data);
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    });
    
    ws.addEventListener('close', () => {
      console.log('🔌 WebSocket connection closed');
      this.sessions.delete(ws);
    });

    ws.addEventListener('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.sessions.delete(ws);
    });
  }

  private broadcast(data: any) {
    const message = JSON.stringify(data);
    console.log(`📢 [WebSocketHandler] Broadcasting message:`, data);
    console.log(`📢 [WebSocketHandler] Message type:`, data.type);
    console.log(`📢 [WebSocketHandler] Active sessions:`, this.sessions.size);
    let successCount = 0;
    
    this.sessions.forEach(ws => {
        try {
            ws.send(message);
            successCount++;
            console.log(`✅ [WebSocketHandler] Sent to session successfully`);
        } catch (err) {
            console.error('❌ [WebSocketHandler] Failed to send to session:', err);
            this.sessions.delete(ws);
        }
    });
    
    console.log(`✅ [WebSocketHandler] Broadcast complete. Successful: ${successCount}/${this.sessions.size}`);
  }
} 