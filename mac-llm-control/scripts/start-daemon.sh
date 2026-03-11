#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ 未检测到 Node.js，请先安装 Node 18+"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "❌ 未检测到 pm2，请先安装: npm i -g pm2"
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

echo "🚀 启动后端 (pm2)..."
pm2 start server/index.js --name mac-llm-control-server --update-env

echo "🚀 启动前端 (pm2)..."
pm2 start "npm --prefix web run dev" --name mac-llm-control-web --update-env

pm2 save

echo "✅ 已后台常驻"
echo "前端: http://localhost:3000"
echo "后端: http://localhost:3001"
