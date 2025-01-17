import { Env } from '../types';

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