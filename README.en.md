Fastify Vite for AI
====
A full-stack AI application development framework based on Fastify and Vite

### Project Introduction
Fastify Vite for AI is a full-stack framework for AI application development, integrating the Fastify server-side framework and the Vite front-end build tool, providing an efficient development experience and a complete project structure.

### Core Features
- High-performance server-side based on Fastify
- Modern front-end development environment built with Vite
- Integrated authentication system (Token authentication)
- Provides basic API interfaces (e.g., ping interface)
- Supports development extensions for AI-related functionalities

### Directory Structure
```
├── client/              # Front-end code
├── controllers/         # Server-side controllers
├── e2e/                 # End-to-end tests
├── public/              # Static resources
├── src/                 # Core source code
├── index.js             # Project configuration
├── server.js            # Server-side startup file
└── vite.config.js       # Vite configuration file
```

### Installation Guide
1. Install pnpm: `npm install -g pnpm`
2. Install dependencies: `pnpm install`

### Usage Instructions
- Start the development server: `pnpm dev`
- Build for production: `pnpm build`
- Run tests: `pnpm test`

### Contribution Guide
Code contributions and documentation improvements are welcome. Please fork the project first, make your changes, and then submit a PR.

### License
This project is licensed under the MIT License. See the LICENSE file for details.