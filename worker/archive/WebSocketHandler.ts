export class WebSocketHandler {
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
      console.log('📢 Broadcasting message to', this.sessions.size, 'clients:', message);
      
      this.sessions.forEach(session => {
        try {
          session.send(JSON.stringify(message));
        } catch (err) {
          console.error('Failed to send to session:', err);
        }
      });
      
      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  }

  async handleSession(ws: WebSocket) {
    console.log('🔌 New WebSocket connection');
    this.sessions.add(ws);
    ws.accept();
    
    ws.addEventListener('close', () => {
      console.log('🔌 WebSocket connection closed');
      this.sessions.delete(ws);
    });

    ws.addEventListener('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.sessions.delete(ws);
    });
  }
} 