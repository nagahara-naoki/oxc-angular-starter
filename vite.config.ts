import { angular } from '@oxc-angular/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [angular({ tsconfig: './tsconfig.json' })],
  define: { APP_COMPILER: JSON.stringify('Oxc + Vite') },
  build: { outDir: 'dist/oxc' },
});
