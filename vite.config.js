import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: '/sardistic.fm/', // Commented out for Railway/Vercel deployment (needs root base)
})
