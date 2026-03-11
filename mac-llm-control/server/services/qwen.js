import { config } from "../config.js";
import { exec } from "../utils/exec.js";
import { isPortOpen, pidByPort, pidsByCommand } from "../utils/monitor.js";

export async function startQwen() {
  if (await isPortOpen(config.qwen.port)) return { message: "Qwen 已在运行" };
  const cmd = `nohup mlx_lm.server \
    --model "${config.qwen.modelPath}" \
    --port ${config.qwen.port} \
    --host 0.0.0.0 \
    > "${config.qwen.log}" 2> "${config.qwen.err}" &`;
  await exec(cmd);
  return { message: "Qwen 启动成功" };
}

export async function stopQwen() {
  const pid = await pidByPort(config.qwen.port);
  if (pid) await exec(`kill ${pid}`);

  const pattern = `mlx_lm.server.*${config.qwen.modelPath.replace(/\s/g, "\\s")}`;
  const pids = await pidsByCommand(pattern);
  for (const p of pids) {
    await exec(`kill ${p}`);
  }
}
