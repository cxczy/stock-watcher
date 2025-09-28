import { join } from "node:path"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default {
  root: join(import.meta.dirname, "client"),
  build: {
    outDir: join(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  plugins: [
    viteReact(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    open: true
  }
}
