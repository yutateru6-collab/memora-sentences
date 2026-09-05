import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('/node_modules/')) return 'vendor';
              if (id.includes('/lib/grammarTerms.ts')) return 'grammar-data';
              if (id.includes('/components/ReaderScreen.tsx')
                  || id.includes('/components/RsvpScreen.tsx')
                  || id.includes('/components/PdfExportModal.tsx')
                  || id.includes('/pdfWorker.tsx')) return 'reader-tools';
              if (id.includes('/components/PromptLibraryScreen.tsx')
                  || id.includes('/lib/readingPrompt.ts')) return 'prompt-tools';
              if (id.includes('/components/BoardScreen.tsx')
                  || id.includes('/components/AmazonScreen.tsx')
                  || id.includes('/components/LegendScreen.tsx')
                  || id.includes('/components/SnsScreen.tsx')) return 'extended-modes';
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
