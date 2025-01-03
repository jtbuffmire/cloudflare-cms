export class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectTimeout: number = 1000; // Start with 1 second
    
    constructor(private url: string, private onMessage: (data: any) => void) {
      this.connect();
    }
  
    private connect() {
      this.ws = new WebSocket(this.url);
  
      this.ws.addEventListener('open', () => {
        console.log('WebSocket connected');
        this.reconnectTimeout = 1000; // Reset timeout on successful connection
      });
  
      this.ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', {
            type: data.type,
            action: data.action,
            payload: data.payload
          });
          
          // Add specific logging for media-related events
          if (data.type === 'media') {
            console.log('🖼️ Media event:', {
              action: data.action,
              id: data.payload?.id,
              name: data.payload?.name
            });
          }
          
          this.onMessage(data);
        } catch (err) {
          console.error('❌ Failed to parse WebSocket message:', err);
          console.log('Raw message:', event.data);
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
  
    public close() {
      if (this.ws) {
        console.log('🔌 Closing WebSocket connection');
        this.ws.close();
      }
    }
  }