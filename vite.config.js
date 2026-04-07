import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
