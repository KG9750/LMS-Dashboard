# Mac LLM Control (Web MVP)

本项目是本地运行的 Web 控制面板，用于启动/停止/监控：
- Qwen MLX 服务
- MiniMax MLX 服务
- OpenClaw Docker

## 运行方式

```bash
# 1) 安装依赖
cd mac-llm-control
npm install

# 2) 启动后端
npm run dev:server

# 3) 启动前端
npm run dev:web
```

前端地址：http://localhost:3000  
后端地址：http://localhost:3001

## 重要说明
- OpenClaw 启动依赖环境变量 `GEMINI_API_KEY`
- 使用了 sudo 创建 /opt/openclaw 目录
- 端口与模型路径在 `server/config.js` 中配置
- 健康检查基于 HTTP（默认 /v1/models）
- 资源监控基于 `ps -p`
