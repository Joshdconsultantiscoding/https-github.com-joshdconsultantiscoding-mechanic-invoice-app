import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                customer: resolve(__dirname, 'customer.html'),
                mechanic: resolve(__dirname, 'standalone.html'),
                offline: resolve(__dirname, 'offline.html')
            }
        },
        outDir: 'dist',
        emptyOutDir: true,
        copyPublicDir: true
    },
    publicDir: 'public'
});
