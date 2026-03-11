# Mac LLM Control (Web MVP)

本项目是本地运行的 Web 控制面板，用于启动/停止/监控：
- Qwen MLX 服务
- MiniMax MLX 服务
- OpenClaw（Docker）

目前已支持：
- 启动/停止/重启
- 端口与 PID 检测
- CPU / 内存 / RSS 监控
- HTTP 健康检查
- 日志查看（Qwen / MiniMax）
- OpenClaw Channels 配置列表（来自 `openclaw channels list --json`）
- 显示 channel 类型 / id
- 在线/离线需要 OpenClaw 额外提供状态字段（当前为 configured/unknown）

---

## 环境要求
- Node.js 18+
- npm / pnpm
- Docker Desktop（用于 OpenClaw）
- Mac 本地已安装并可运行 `mlx_lm.server`

---

## 运行方式

### 方式 A：一键启动（前台开发）
```bash
cd mac-llm-control
./scripts/start-dev.sh
```

### 方式 B：后台常驻（不自启）
```bash
cd mac-llm-control
# 先安装 pm2（仅首次）
npm i -g pm2

./scripts/start-daemon.sh
# 停止：
./scripts/stop-daemon.sh
```

### 方式 C：手动启动
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

---

## 配置说明
所有配置集中在 `server/config.js`：
- 模型路径（Qwen / MiniMax）
- 端口配置
- 日志路径
- OpenClaw 容器配置与 workspace 路径
- OpenClaw sessions 路径（用于累计 token）

建议根据你的实际磁盘挂载路径修改 `modelPath`。

---

## 重要说明
- OpenClaw 启动依赖环境变量 `GEMINI_API_KEY`
- 使用了 sudo 创建 `/opt/openclaw` 目录
- 健康检查基于 HTTP（默认 `/v1/models`）
- 资源监控基于 `ps -p`

---

## 常见问题

### 1. 端口已占用
请检查占用进程：
```bash
lsof -i :8081
lsof -i :8082
```

### 2. Docker 未启动
OpenClaw 启动前请确保 Docker Desktop 已启动：
```bash
docker info
```

### 3. MLX 未安装或模型路径错误
确保：
```bash
python3 -c "import mlx_lm"
```
并检查模型路径是否存在。
