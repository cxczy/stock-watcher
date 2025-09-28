Fastify Vite for AI
====
一个基于 Fastify 和 Vite 的 AI 应用开发框架

### 项目简介
Fastify Vite for AI 是一个面向 AI 应用开发的全栈框架，集成了 Fastify 服务端框架和 Vite 前端构建工具，提供高效的开发体验和完整的项目结构。

### 核心功能
- 基于 Fastify 的高性能服务端
- 使用 Vite 构建的现代化前端开发环境
- 集成认证系统（Token 认证）
- 提供基础的 API 接口（如 ping 接口）
- 支持 AI 相关功能的开发扩展

### 目录结构
```
├── client/              # 前端代码
├── controllers/         # 服务端控制器
├── e2e/                 # 端到端测试
├── public/              # 静态资源
├── src/                 # 核心源码
├── index.js             # 项目配置
├── server.js            # 服务端启动文件
└── vite.config.js       # Vite 配置文件
```

### 安装指南
1. 安装 pnpm: `npm install -g pnpm`
2. 安装依赖: `pnpm install`

### 使用说明
- 启动开发服务器: `pnpm dev`
- 构建生产环境: `pnpm build`
- 运行测试: `pnpm test`

### 贡献指南
欢迎贡献代码和改进文档。请先 fork 项目，进行修改后提交 PR。

### 许可证
本项目采用 MIT 许可证。详情见 LICENSE 文件。