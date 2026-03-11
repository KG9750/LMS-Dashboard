import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { isPortOpen, pidByPort, dockerContainerState, getProcessUsage, checkHttpHealth } from "./utils/monitor.js";
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
      health = await checkHttpHealth(svc.healthUrl);
      const tokens = sumTokensInSessions(config.openclaw.sessionsDir);
      result[key] = { name: svc.name, status, port: svc.port, pid, usage, health, tokens };
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

app.get("/api/channels", async (req, res) => {
  try {
    const { stdout, stderr } = await exec("openclaw channels list --json");
    const raw = extractJson(stdout) || extractJson(stderr) || "{}";
    const data = JSON.parse(raw);
    const channels = [];
    const chat = data?.chat || {};
    for (const [type, ids] of Object.entries(chat)) {
      for (const id of ids || []) {
        channels.push({ type, channel: type, id, status: "configured" });
      }
    }
    res.json({ channels, raw: data });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

const port = 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
