import { defineConfig } from 'vite'

// שם הריפו ב-GitHub. אם משנים את שם הריפו, משנים כאן שורה אחת בלבד.
const REPO_NAME = 'daniel-magic-english-castle'

// ב-GitHub Pages האתר יושב תחת /<repo>/, ומקומית תחת /.
// כך גם `npm run dev` וגם `npm run preview` עובדים בלי שינוי ידני.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? `/${REPO_NAME}/` : '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    port: 4173,
  },
})
