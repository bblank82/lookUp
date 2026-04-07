import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
    plugins: [{
        name: 'mock-credentials',
        resolveId(source) {
            if (source.includes('credentials.json')) {
                const absolutePath = resolve(__dirname, 'credentials.json');
                if (!fs.existsSync(absolutePath)) {
                    return '\0virtual:credentials.json';
                }
            }
            return null;
        },
        load(id) {
            if (id === '\0virtual:credentials.json') {
                return '{ "clientId": "", "clientSecret": "" }';
            }
            return null;
        }
    }],
    build: {
        rollupOptions: {
            input: {
                main:   resolve(__dirname, 'index.html'),
                mobile: resolve(__dirname, 'mobile.html'),
            },
        },
    },
    server: {
        proxy: {
            // Proxy OpenSky OAuth2 token requests
            '/opensky-token': {
                target: 'https://auth.opensky-network.org',
                changeOrigin: true,
                rewrite: () => '/auth/realms/opensky-network/protocol/openid-connect/token',
            },
            // Proxy OpenSky API requests
            '/opensky-api': {
                target: 'https://opensky-network.org',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/opensky-api/, '/api'),
            },
        },
    },
});
