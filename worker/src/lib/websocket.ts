import { Env } from '../types';
import type { Request as CFRequest, Response as CFResponse } from '@cloudflare/workers-types';

interface UpdateMessage {
    type: string;
    data: any;
}

export async function broadcastUpdate(env: Env, domain: string, message: UpdateMessage): Promise<void> {
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(doId);
    
    await handler.fetch(new Request('http://internal/broadcast', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Domain': domain
        },
        body: JSON.stringify(message)
    }));
}

export async function handleWebSocketUpgrade(request: CFRequest, env: Env): Promise<CFResponse> {
    const url = new URL(request.url);
    
    // Ensure the path matches our API version
    if (url.pathname !== `/ws`) {
        return new Response('Invalid WebSocket path', { status: 400 }) as unknown as CFResponse;
    }

    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 }) as unknown as CFResponse;
    }

    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(doId);
    
    return handler.fetch(request as unknown as Request) as unknown as CFResponse;
} 