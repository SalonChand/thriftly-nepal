import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      // We removed the 'includeAssets' line to prevent errors with missing files
      manifest: {
        name: 'ThriftLy Nepal',
        short_name: 'ThriftLy',
        theme_color: '#ffffff',
        // We kept icons simple. If these files don't exist, it won't crash the build now.
        icons: [] 
      }
    })
  ],
})