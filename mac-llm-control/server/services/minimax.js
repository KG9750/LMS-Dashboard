import { config } from "../config.js";
import { exec } from "../utils/exec.js";
import { isPortOpen, pidByPort, pidsByCommand } from "../utils/monitor.js";

export async function startMinimax() {
  if (await isPortOpen(config.minimax.port)) return { message: "MiniMax 已在运行" };
  const cmd = `nohup mlx_lm.server \
    --model "${config.minimax.modelPath}" \
    --port ${config.minimax.port} \
    --host 0.0.0.0 \
    --trust-remote-code \
    > "${config.minimax.log}" 2> "${config.minimax.err}" &`;
  await exec(cmd);
  return { message: "MiniMax 启动成功" };
}

export async function stopMinimax() {
  const pid = await pidByPort(config.minimax.port);
  if (pid) await exec(`kill ${pid}`);

  const pattern = `mlx_lm.server.*${config.minimax.modelPath.replace(/\s/g, "\\s")}`;
  const pids = await pidsByCommand(pattern);
  for (const p of pids) {
    await exec(`kill ${p}`);
  }
}
