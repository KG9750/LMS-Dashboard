import { config } from "../config.js";
import { exec } from "../utils/exec.js";
import { isPortOpen, pidByPort } from "../utils/monitor.js";

export async function startMinimax() {
  if (await isPortOpen(config.minimax.port)) throw new Error("MiniMax 已在运行");
  const cmd = `nohup mlx_lm.server \
    --model "${config.minimax.modelPath}" \
    --port ${config.minimax.port} \
    --host 0.0.0.0 \
    --trust-remote-code \
    > "${config.minimax.log}" 2> "${config.minimax.err}" &`;
  await exec(cmd);
}

export async function stopMinimax() {
  const pid = await pidByPort(config.minimax.port);
  if (pid) await exec(`kill ${pid}`);
}
