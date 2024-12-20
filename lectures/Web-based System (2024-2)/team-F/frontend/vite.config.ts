import {ConfigEnv, defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default ({mode}: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd());
  const TargetHost = env.VITE_BACKEND_URL ?? 'localhost:5000';

  return defineConfig({

    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: TargetHost,
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  })

}
