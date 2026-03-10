import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const defaultBasePath = mode === 'production' ? '/move/' : '/';
  const configuredBasePath = env.VITE_APP_BASE_PATH || defaultBasePath;
  const normalizedBasePath = configuredBasePath.endsWith('/')
    ? configuredBasePath
    : `${configuredBasePath}/`;

  return {
    base: normalizedBasePath,
    plugins: [react()],
  };
});
