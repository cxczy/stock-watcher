import server from "./server.js"
import autoload from "@fastify/autoload"
import fastifyVite from "@fastify/vite"
import swagger from "@fastify/swagger"
import scalarApi from "@scalar/fastify-api-reference"
import { resolve } from "path"

if (process.env.NODE_ENV !== "production")
  await server.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "后端接口文档",
        description: "文档由代码自动生成",
        version: "1.0.0",
      },
    },
  })
await server.register(autoload, {
  dir: resolve(import.meta.dirname, "./controllers"),
})
if (process.env.NODE_ENV !== "production")
  await server.register(scalarApi, {
    routePrefix: "/doc",
    configuration: {
      theme: "purple",
    },
  })

await server.register(fastifyVite, {
  root: import.meta.dirname,
  dev: process.env.NODE_ENV !== "production",
  spa: true,
})

await server.vite.ready()

server.all("*", (req, res) => {
  if (!req.url.startsWith("/api") && !req.url.startsWith("/doc")) {
    // 非 /api 路径，返回 HTML（SPA 前端路由）
    return res.html()
  }
})
const res = await server.listen({ port: 3000 })
console.log(`Server listening at ${res}`)
