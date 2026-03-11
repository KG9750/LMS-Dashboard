import { exec } from "./exec.js";

export async function isPortOpen(port) {
  try {
    const { stdout } = await exec(`lsof -i :${port} | wc -l`);
    return Number(stdout.trim()) > 0;
  } catch {
    return false;
  }
}

export async function pidByPort(port) {
  try {
    const { stdout } = await exec(`lsof -ti :${port}`);
    const pid = stdout.trim().split("\n")[0];
    return pid || null;
  } catch {
    return null;
  }
}

export async function dockerContainerState(name) {
  try {
    const { stdout } = await exec(`docker ps -a --filter name=${name} --format "{{.Status}}"`);
    const status = stdout.trim();
    return status || "not_found";
  } catch {
    return "unknown";
  }
}
