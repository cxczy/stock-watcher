import { join } from "node:path"
import viteFastify from "@fastify/vite/plugin"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default {
  root: join(import.meta.dirname, "client"),
  plugins: [
    viteFastify({ spa: true, useRelativePaths: false }),
    viteReact(),
    tailwindcss(),
  ],
}
