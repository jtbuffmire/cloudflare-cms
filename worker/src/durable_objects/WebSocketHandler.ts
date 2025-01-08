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
    console.log('🎯 WebSocketHandler fetch:', { 
      pathname: url.pathname,
      method: request.method 
    });

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        console.log('❌ Not a WebSocket upgrade request');
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      console.log('✨ Creating new WebSocket connection');
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
        message: JSON.stringify(message, null, 2)
      });
      this.broadcast(message);
      return new Response('OK');
    }

    console.log('❌ Unknown path:', url.pathname);
    return new Response('Not found', { status: 404 });
  }

  private async handleSession(ws: WebSocket) {
    console.log('🔌 New WebSocket connection established');
    this.sessions.add(ws);
    ws.accept();
    
    // Send initial connection message
    try {
      ws.send(JSON.stringify({ type: 'CONNECTED' }));
      console.log('✅ Sent connection confirmation');
    } catch (err) {
      console.error('❌ Failed to send connection confirmation:', err);
    }
    
    ws.addEventListener('message', async (msg) => {
      // console.log('📨 Received WebSocket message:', msg.data);
      if (msg.data === 'ping') return;
      
      try {
        if (typeof msg.data === 'string') {
          const data = JSON.parse(msg.data);
          console.log('📨 Parsed message data:', data);
          this.broadcast(data);
        }
      } catch (err) {
        console.error('❌ Failed to parse message:', err);
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
    console.log(`📢 [WebSocketHandler] Broadcasting message:`, {
      type: data.type,
      messageLength: message.length,
      activeSessions: this.sessions.size,
      data: JSON.stringify(data, null, 2)
    });
    
    let successCount = 0;
    let failCount = 0;
    
    this.sessions.forEach(ws => {
        try {
            ws.send(message);
            successCount++;
            // console.log(`✅ Successfully sent to session`);
        } catch (err) {
            failCount++;
            // console.error('❌ Failed to send to session:', err);
            this.sessions.delete(ws);
        }
    });
    
    console.log(`📊 Broadcast results:`, {
      successful: successCount,
      failed: failCount,
      totalSessions: this.sessions.size
    });
  }
} 