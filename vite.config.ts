import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Mini apps load inside Nimiq Pay on a phone, so the dev server has to be
// reachable over the LAN (host: true). Open http://<your-lan-ip>:5173 from
// the Mini Apps "Custom URL" field, never localhost.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
