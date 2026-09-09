import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Le build produit un fichier HTML unique (dist/index.html) : c'est ce fichier
// qui est publié comme application testable.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2020', assetsInlineLimit: 100_000_000, cssCodeSplit: false },
})
