import { join } from "node:path"
import viteFastify from "@fastify/vite/plugin"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default {
  root: join(import.meta.dirname, "client"),
  build: {
    outDir: join(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  plugins: [
    viteFastify({ 
      spa: true, 
      useRelativePaths: false,
      dev: {
        outDir: join(import.meta.dirname, "dist")
      }
    }),
    viteReact(),
    tailwindcss(),
  ],
}
