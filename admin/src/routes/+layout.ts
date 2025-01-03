import { WebSocketClient } from '$lib/websocket';
import { invalidate } from '$app/navigation';

export const load = ({ url }) => {
  let wsClient;
  if (typeof window !== 'undefined') {
    wsClient = new WebSocketClient('ws://localhost:8787/ws', async (data) => {
      console.log('WebSocket message received:', data);
      
      switch (data.type) {
        case 'MEDIA_DELETE':
          // Invalidate only the media data
          await invalidate('app:media');
          break;
          
        case 'MEDIA_UPDATE':
          // Invalidate only the media data
          await invalidate('app:media');
          break;
          
        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    });
  }

  return {
    wsClient
  };
}; 