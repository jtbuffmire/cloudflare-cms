import type { Response as CFResponse } from '@cloudflare/workers-types';

export function json(data: any, init?: ResponseInit): CFResponse {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    },
    ...init
  }) as unknown as CFResponse;
} 