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

export async function pidsByCommand(pattern) {
  try {
    const { stdout } = await exec(`pgrep -f "${pattern}"`);
    const pids = stdout.trim().split("\n").filter(Boolean);
    return pids;
  } catch {
    return [];
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

export async function dockerInspect(name) {
  try {
    const { stdout } = await exec(`docker inspect ${name}`);
    const arr = JSON.parse(stdout || "[]");
    return arr[0] || null;
  } catch {
    return null;
  }
}

export async function dockerInfo() {
  try {
    const { stdout } = await exec(`docker info --format "{{json .}}"`);
    return JSON.parse(stdout || "{}") || {};
  } catch {
    return null;
  }
}

export async function getProcessUsage(pid) {
  if (!pid) return { cpu: null, mem: null, rss: null };
  try {
    const { stdout } = await exec(`ps -p ${pid} -o %cpu=,%mem=,rss=`);
    const [cpu, mem, rss] = stdout.trim().split(/\s+/);
    return {
      cpu: cpu ? Number(cpu) : null,
      mem: mem ? Number(mem) : null,
      rss: rss ? Number(rss) : null
    };
  } catch {
    return { cpu: null, mem: null, rss: null };
  }
}

export async function checkHttpHealth(url) {
  try {
    const { stdout } = await exec(`curl -s -o /dev/null -w "%{http_code}" --max-time 2 "${url}"`);
    const code = Number(stdout.trim());
    return code >= 200 && code < 500 ? code : null;
  } catch {
    return null;
  }
}
