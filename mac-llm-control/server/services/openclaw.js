import { config } from "../config.js";
import { exec } from "../utils/exec.js";
import { dockerContainerState } from "../utils/monitor.js";

export async function startOpenclaw() {
  const status = await dockerContainerState(config.openclaw.name);
  if (status !== "not_found") {
    await exec(`docker rm -f ${config.openclaw.name}`);
  }
  const cmd = `docker run -d \
    --name ${config.openclaw.name} \
    --restart unless-stopped \
    -p ${config.openclaw.port}:${config.openclaw.port} \
    --user 0:0 \
    -v "${config.openclaw.configDir}:/root/.openclaw" \
    -v "${config.openclaw.workspace}:/root/.openclaw/workspace" \
    -v "/Users/leo/.docker/run/docker.sock:/var/run/docker.sock" \
    -e GEMINI_API_KEY="$GEMINI_API_KEY" \
    ${config.openclaw.image}`;
  await exec(`sudo mkdir -p "${config.openclaw.configDir}/workspace"`);
  await exec(cmd);
}

export async function stopOpenclaw() {
  await exec(`docker rm -f ${config.openclaw.name}`);
}
