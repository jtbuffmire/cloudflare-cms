import { Env } from '../types';
import { D1Database } from '@cloudflare/workers-types';

export function getDB(env: Env): D1Database {
    return env.DB;
} 