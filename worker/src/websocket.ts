export class WebSocketHandler implements DurableObject {
    private sessions: WebSocket[] = [];
  
    async fetch(request: Request) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }
      
      const { 0: client, 1: server } = new WebSocketPair();
      
      await this.handleSession(server);
      
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }
  
    private async handleSession(webSocket: WebSocket) {
      webSocket.accept();
      this.sessions.push(webSocket);
      
      webSocket.addEventListener('close', () => {
        this.sessions = this.sessions.filter(ws => ws !== webSocket);
      });
      
      // Handle internal broadcast messages
      webSocket.addEventListener('message', async (msg) => {
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
    }
  
    private broadcast(data: any) {
      const message = JSON.stringify(data);
      this.sessions = this.sessions.filter(ws => {
        try {
          ws.send(message);
          return true;
        } catch (err) {
          return false; // Remove failed connections
        }
      });
    }
  }