import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    target: 'node20',                 // Node library, not browser
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.cjs',
    },
    rollupOptions: {
      // Don’t bundle Playwright or Node core modules
      external: [
        'playwright', 'fs', 'path', 'url', 'os', 'tty', 'stream', /^node:.*/
      ],
      output: {
        exports: 'named',
        interop: 'auto',
      },
    },
    minify: false,                    // libs usually ship unminified
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    dts({
      entryRoot: 'src',
      outputDir: 'dist',
      rollupTypes: true,
      // If you reference .d.ts from deps, you can include/exclude here
    }),
  ],
});
