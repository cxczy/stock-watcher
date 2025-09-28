import server from "../server.js"

server.get(
  "/api/ping",
  {
    schema: {
      summary: "ping",
      description: "检查服务器状态",
      tags: ["基础"],
    },
  },
  async () => {
    return "pong"
  }
)
