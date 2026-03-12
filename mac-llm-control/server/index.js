import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { isPortOpen, pidByPort, dockerContainerState, getProcessUsage, checkHttpHealth, dockerInspect, dockerInfo } from "./utils/monitor.js";
import { tailFile } from "./utils/logs.js";
import { startQwen, stopQwen } from "./services/qwen.js";
import { startMinimax, stopMinimax } from "./services/minimax.js";
import { startOpenclaw, stopOpenclaw } from "./services/openclaw.js";
import { sumTokensInSessions } from "./utils/tokens.js";
import { exec } from "./utils/exec.js";

const app = express();
app.use(cors());
app.use(express.json());

const services = {
  qwen: {
    name: "Qwen",
    port: config.qwen.port,
    log: config.qwen.log,
    start: startQwen,
    stop: stopQwen,
    healthUrl: `http://localhost:${config.qwen.port}/v1/models`
  },
  minimax: {
    name: "MiniMax",
    port: config.minimax.port,
    log: config.minimax.log,
    start: startMinimax,
    stop: stopMinimax,
    healthUrl: `http://localhost:${config.minimax.port}/v1/models`
  },
  openclaw: {
    name: "OpenClaw",
    port: config.openclaw.port,
    log: null,
    start: startOpenclaw,
    stop: stopOpenclaw,
    healthUrl: `http://localhost:${config.openclaw.port}`
  }
};

app.get("/api/status", async (req, res) => {
  const result = {};
  for (const [key, svc] of Object.entries(services)) {
    let status = "stopped";
    let pid = null;
    let usage = { cpu: null, mem: null, rss: null };
    let health = null;

    if (key === "openclaw") {
      const st = await dockerContainerState(config.openclaw.name);
      status = st === "not_found" ? "stopped" : st;
      const inspect = await dockerInspect(config.openclaw.name);
      const docker = await dockerInfo();
      const containerState = inspect?.State?.Status || null;
      const startedAt = inspect?.State?.StartedAt || null;
      const healthStatus = inspect?.State?.Health?.Status || null;
      health = await checkHttpHealth(svc.healthUrl);
      const tokens = sumTokensInSessions(config.openclaw.sessionsDir);
      result[key] = {
        name: svc.name,
        status,
        port: svc.port,
        pid,
        usage,
        health,
        tokens,
        docker: {
          serverVersion: docker?.ServerVersion || null,
          operatingSystem: docker?.OperatingSystem || null,
          containerState,
          startedAt,
          healthStatus
        }
      };
      continue;
    } else {
      const open = await isPortOpen(svc.port);
      status = open ? "running" : "stopped";
      pid = open ? await pidByPort(svc.port) : null;
      usage = await getProcessUsage(pid);
      health = await checkHttpHealth(svc.healthUrl);
    }

    result[key] = { name: svc.name, status, port: svc.port, pid, usage, health };
  }
  res.json(result);
});

app.post("/api/start/:name", async (req, res) => {
  const svc = services[req.params.name];
  if (!svc) return res.status(404).json({ error: "unknown service" });
  try {
    const result = await svc.start();
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post("/api/stop/:name", async (req, res) => {
  const svc = services[req.params.name];
  if (!svc) return res.status(404).json({ error: "unknown service" });
  try {
    await svc.stop();
    res.json({ ok: true, message: "已停止" });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post("/api/restart/:name", async (req, res) => {
  const svc = services[req.params.name];
  if (!svc) return res.status(404).json({ error: "unknown service" });
  try {
    await svc.stop();
    await svc.start();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/api/logs/:name", async (req, res) => {
  const svc = services[req.params.name];
  if (!svc || !svc.log) return res.status(404).json({ error: "no logs" });
  try {
    const logs = await tailFile(svc.log, 200);
    res.json({ logs });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

async function runLocal(cmd) {
  return exec(cmd);
}

async function runRemote(machine, cmd) {
  const { host, user, keyPath } = machine;
  if (!host) throw new Error(`missing host for ${machine.name}`);
  const full = `ssh -i "${keyPath}" -o StrictHostKeyChecking=accept-new ${user}@${host} "${cmd}"`;
  return exec(full);
}

function parseChannelsStatus(raw) {
  const channels = [];
  const channelMeta = raw?.channelMeta || [];
  const channelLabels = raw?.channelLabels || {};
  const channelDetailLabels = raw?.channelDetailLabels || {};
  const channelAccounts = raw?.channelAccounts || {};
  const channelsStatus = raw?.channels || {};

  for (const meta of channelMeta) {
    const id = meta.id;
    const label = meta.label || channelLabels[id] || id;
    const detail = meta.detailLabel || channelDetailLabels[id] || "";
    const status = channelsStatus[id] || {};
    const accounts = channelAccounts[id] || [];
    const running = status.running || accounts.some(a => a.running);
    const bot = accounts[0]?.accountId || "default";

    channels.push({
      type: id,
      channel: label,
      detailLabel: detail,
      botName: bot,
      status: running ? "online" : "offline",
      lastError: status.lastError || null,
      mode: status.mode || accounts[0]?.mode || null
    });
  }

  return channels;
}

function parseModelFromStatus(raw) {
  return raw?.model?.primary || raw?.model?.id || raw?.model || null;
}

async function fetchMachine(machine) {
  const runner = machine.local ? runLocal : (cmd) => runRemote(machine, cmd);
  const [{ stdout: statusOut, stderr: statusErr }, { stdout: chOut, stderr: chErr }] = await Promise.all([
    runner("openclaw status --json"),
    runner("openclaw channels status --json")
  ]);

  const statusRaw = JSON.parse(extractJson(statusOut) || extractJson(statusErr) || "{}" );
  const channelsRaw = JSON.parse(extractJson(chOut) || extractJson(chErr) || "{}" );

  let docker = null;
  if (machine.hasDocker) {
    const { stdout: dOut } = await runner("docker inspect openclaw 2>/dev/null || true");
    const arr = JSON.parse(dOut || "[]");
    const inspect = arr[0] || null;
    docker = {
      containerState: inspect?.State?.Status || null,
      startedAt: inspect?.State?.StartedAt || null,
      healthStatus: inspect?.State?.Health?.Status || null
    };
  }

  return {
    id: machine.id,
    name: machine.name,
    hasDocker: machine.hasDocker,
    model: parseModelFromStatus(statusRaw),
    channels: parseChannelsStatus(channelsRaw),
    docker
  };
}

app.get("/api/machines", async (req, res) => {
  const machines = [];
  for (const m of config.machines) {
    if (!m.enabled) continue;
    try {
      const data = await fetchMachine({ ...m, local: false });
      machines.push(data);
    } catch (e) {
      machines.push({ id: m.id, name: m.name, error: e.message || String(e) });
    }
  }
  res.json({ machines });
});

const port = 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
