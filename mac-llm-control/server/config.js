export const config = {
  qwen: {
    modelPath: "/Volumes/Leo_LLM/LLM Models/qwen235b",
    port: 8081,
    log: "/tmp/qwen_server.log",
    err: "/tmp/qwen_server.err",
  },
  minimax: {
    modelPath: "/Volumes/Leo_LLM/LLM Models/MiniMax-M2-4bit",
    port: 8082,
    log: "/tmp/minimax_server.log",
    err: "/tmp/minimax_server.err",
  },
  mlx: {
    modelPath: "/Volumes/Leo_LLM/LLM Models/qwen235b",
    port: 8081
  },
  openclaw: {
    name: "openclaw",
    configDir: "/opt/openclaw",
    workspace: "/Users/leo/Library/Mobile Documents/com~apple~CloudDocs/Personal/LMS Docker File",
    port: 18789,
    image: "ghcr.io/openclaw/openclaw:latest"
  }
};
