#!/bin/bash
set -e

if ! command -v pm2 >/dev/null 2>&1; then
  echo "❌ 未检测到 pm2"
  exit 1
fi

pm2 stop mac-llm-control-server || true
pm2 stop mac-llm-control-web || true
pm2 delete mac-llm-control-server || true
pm2 delete mac-llm-control-web || true
pm2 save

echo "✅ 已停止后台进程"
