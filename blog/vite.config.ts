import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';
import type { IncomingMessage, ServerResponse } from 'http';

interface ProxyReq extends IncomingMessage {
    setHeader(name: string, value: string): void;
    getHeaders(): { [key: string]: string | string[] | undefined };
}

interface ProxyRes extends ServerResponse {
    statusCode: number;
}

const port = parseInt(process.env.PORT || '4173', 10);
const workerUrl = process.env.API_URL || 'http://localhost:8787';

export default defineConfig(({ mode }) => {
    console.log('🔨 Building in mode:', mode);
    return {
        assetsInclude: ['**/*.md'], // added since we're not processing the legacy markdown files
        plugins: [
            enhancedImages(),
            sveltekit(),
            Icons({
                compiler: 'svelte',
                autoInstall: true,
                defaultStyle: 'vertical-align: middle;'
            })
        ],
        test: {
            include: ['src/**/*.{test,spec}.{js,ts}']
        },
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: '@use "src/variables" as *;'
                }
            }
        },
        define: {
            'process.env.API_URL': JSON.stringify(process.env.API_URL)
        },
        server: {
            host: 'localhost',
            port: port,
            strictPort: true,
            hmr: {
                host: 'localhost',
                protocol: 'ws',
                clientPort: port
            },

        }
    }
}); 