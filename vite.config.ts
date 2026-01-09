import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/lakehouse-calendar/',
  plugins: [react()],
})
