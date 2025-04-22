// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
/// <reference types="@sveltejs/kit" />
import { KVNamespace, DurableObjectNamespace } from '@cloudflare/workers-types';

declare global {
	namespace App {
		// interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
		interface Platform {
			env?: {
				// Add your Cloudflare bindings here if needed
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
