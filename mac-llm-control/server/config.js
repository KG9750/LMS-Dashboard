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
    configDir: "/Users/leo/openclaw/config",
    workspace: "/Users/leo/openclaw/workspace",
    sessionsDir: "/Users/leo/openclaw/config/agents/main/sessions",
    port: 18789,
    image: "ghcr.io/openclaw/openclaw:latest"
  },
  machines: [
    {
      id: "studio-m3",
      name: "Mac Studio M3 Ultra",
      host: "192.168.50.191",
      user: "leo",
      keyPath: "/Users/leo/.ssh/id_ed25519",
      hasDocker: true,
      openclawViaDocker: true,
      containerName: "openclaw",
      enabled: true
    },
    {
      id: "mbp-m4",
      name: "MacBook Pro M4",
      host: null,
      user: "leo",
      keyPath: "/Users/leo/.ssh/id_ed25519",
      hasDocker: true,
      openclawViaDocker: false,
      containerName: "openclaw",
      enabled: false
    },
    {
      id: "mbp-m2",
      name: "MacBook Pro M2",
      host: "192.168.50.144",
      user: "leo",
      keyPath: "/Users/leo/.ssh/id_ed25519",
      hasDocker: false,
      openclawViaDocker: false,
      containerName: null,
      enabled: true
    },
    {
      id: "rpi4",
      name: "Raspberry Pi 4",
      host: "192.168.50.24",
      user: "leo",
      keyPath: "/Users/leo/.ssh/id_ed25519",
      hasDocker: false,
      openclawViaDocker: false,
      containerName: null,
      enabled: true
    }
  ]
};
