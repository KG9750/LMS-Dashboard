import { config } from "../config.js";
import { exec } from "../utils/exec.js";
import { isPortOpen, pidByPort } from "../utils/monitor.js";

export async function startQwen() {
  if (await isPortOpen(config.qwen.port)) throw new Error("Qwen 已在运行");
  const cmd = `nohup mlx_lm.server \
    --model "${config.qwen.modelPath}" \
    --port ${config.qwen.port} \
    --host 0.0.0.0 \
    > "${config.qwen.log}" 2> "${config.qwen.err}" &`;
  await exec(cmd);
}

export async function stopQwen() {
  const pid = await pidByPort(config.qwen.port);
  if (pid) await exec(`kill ${pid}`);
}
