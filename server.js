import Fastify from "fastify"
import jwt from "@fastify/jwt"
import config from "./config.js"

const server = Fastify()

const whiteList = ["/api/ping", "/api/auth"]

server.register(jwt, {
  secret: config.appSecret,
})

server.addHook("onRequest", async (req, res) => {
  const usedUrl = req.url.split("?")[0]
  if (usedUrl.startsWith("/api")) {
    if (!whiteList.includes(usedUrl)) {
      try {
        req.user = await req.jwtVerify()
      } catch {
        res.code(401)
        res.send("登录失效")
      }
    }
  }
})
export default server
