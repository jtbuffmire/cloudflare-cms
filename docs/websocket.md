websocket.md

# WebSocket Protocol Documentation

## Overview

The CMS uses WebSocket connections for real-time updates between the backend (Cloudflare Worker) and frontends (Admin Panel and Blog). The WebSocket server runs on the Worker and manages bidirectional communication for instant updates to site configuration, posts, and pictures.

## Connection Details

### Endpoint
```
ws://[worker-url]/ws
```

For local development: `ws://localhost:8787/ws`

### Connection Lifecycle

1. **Initial Connection**
   - Client attempts connection to WebSocket endpoint
   - Server accepts connection and sends a "HELLO" message
   - Client should implement reconnection logic (default: 5 attempts with exponential backoff)

2. **Heartbeat**
   - Client sends "ping" messages (these are ignored by the server)
   - Connection automatically closes on error or timeout

## Message Types

### Server to Client Events

```typescript
interface WebSocketMessage {
  type: string;
  data?: any;
}
```

#### Available Events:

1. **SITE_CONFIG_UPDATE**
   ```typescript
   {
     type: 'SITE_CONFIG_UPDATE',
     data: {
       config: {
         title: string;
         description: string;
         nav_links: Record<string, number>; // 0 or 1 values
       }
     }
   }
   ```

2. **POSTS_UPDATE**
   ```typescript
   {
     type: 'POSTS_UPDATE',
     data: {
       posts: Array<Post>
     }
   }
   ```

3. **POST_UPDATE**
   ```typescript
   {
     type: 'POST_UPDATE',
     data: {
       post: Post
     }
   }
   ```

4. **POST_CREATE**
   ```typescript
   {
     type: 'POST_CREATE',
     data: {
       post: Post
     }
   }
   ```

5. **POST_DELETE**
   ```typescript
   {
     type: 'POST_DELETE',
     data: {
       id: string
     }
   }
   ```

## Client Implementation

### Subscription Example

```javascript
import { WebSocketClient } from './websocket';

const wsClient = new WebSocketClient('ws://localhost:8787/ws');

// Subscribe to site config updates
wsClient.subscribe('SITE_CONFIG_UPDATE', (data) => {
  console.log('Site config updated:', data.config);
  // Handle the update
});

// Subscribe to post updates
wsClient.subscribe('POSTS_UPDATE', (data) => {
  // console.log('Posts updated:', data.posts);
  // Handle the update
});
```

### Error Handling

The client implements automatic reconnection with exponential backoff:
- Initial timeout: 1000ms
- Maximum reconnection attempts: 5
- Timeout increases with each attempt

### Logging

The WebSocket client includes extensive logging for debugging:
- Connection attempts
- Message receipt and parsing
- Subscription management
- Errors and reconnection attempts

## Server Implementation

The WebSocket server is implemented as a Cloudflare Durable Object, maintaining state for all connected clients.

### Broadcasting

The server can broadcast messages to all connected clients:

```typescript
interface BroadcastRequest {
  type: string;
  data: any;
}
```

To broadcast a message from the Worker:
```typescript
const id = env.WEBSOCKET_HANDLER.idFromName('default');
const handler = env.WEBSOCKET_HANDLER.get(id);
await handler.fetch('http://internal/broadcast', {
  method: 'POST',
  body: JSON.stringify({
    type: 'SITE_CONFIG_UPDATE',
    data: { config: updatedConfig }
  })
});
```

## Security Considerations

1. WebSocket connections are currently unprotected - implement authentication for production
2. Messages are sent in plain text - consider encryption for sensitive data
3. Implement rate limiting for production use

## Development Tools

For testing WebSocket connections:
- Browser DevTools Network tab
- WebSocket testing tools (e.g., wscat)
- Client-side console logs provide detailed debugging information
