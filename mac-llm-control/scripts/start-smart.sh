#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

check_port() {
  local port=$1
  if lsof -i :$port >/dev/null 2>&1; then
    echo "❌ 端口 $port 被占用。"
    if [ "$FORCE_KILL" = "1" ]; then
      echo "⚠️ FORCE_KILL=1，尝试释放端口 $port"
      lsof -ti :$port | xargs kill -9 || true
    else
      echo "提示：设置 FORCE_KILL=1 可强制释放端口"
      exit 1
    fi
  fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "❌ 未检测到 Node.js，请先安装 Node 18+"
  exit 1
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️ GEMINI_API_KEY 未设置。OpenClaw 启动时会失败。"
  echo "   请先执行: export GEMINI_API_KEY=你的真实Key"
fi

if [ ! -d node_modules ]; then
  echo "📦 安装依赖..."
  npm install
fi

check_port 3000
check_port 3001

echo "🚀 启动后端..."
( cd server && npm run dev ) &
SERVER_PID=$!

echo "🚀 启动前端..."
( cd web && npm run dev ) &
WEB_PID=$!

echo "✅ 已启动"
 echo "前端: http://localhost:3000"
 echo "后端: http://localhost:3001"

trap "echo '停止中...'; kill $SERVER_PID $WEB_PID" INT TERM
wait
