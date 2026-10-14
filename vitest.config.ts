import { mergeConfig, defineConfig as defineViteConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineVitestConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.{test,spec}.{ts,tsx}']
    }
  })
);
