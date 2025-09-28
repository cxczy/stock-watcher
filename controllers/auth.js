import config from "../config.js"
import server from "../server.js"

server.post(
  "/api/auth",
  {
    schema: {
      summary: "管理员登录",
      description: "管理员使用后端配置的用户名密码",
      tags: ["认证"],
      body: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: {
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
          password: {
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            token: { type: "string", description: "认证 Token" },
          },
        },
        400: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  },
  async (req, res) => {
    const { username, password } = req.body
    if (username === config.adminName && password === config.adminPassword) {
      const token = await res.jwtSign({ username, password })
      return { token }
    } else {
      reply.status(400)
      return { message: "用户名或密码错误" }
    }
  }
)
