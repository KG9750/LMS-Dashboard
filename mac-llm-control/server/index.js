import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { isPortOpen, pidByPort, dockerContainerState } from "./utils/monitor.js";
import { tailFile } from "./utils/logs.js";
import { startQwen, stopQwen } from "./services/qwen.js";
import { startMinimax, stopMinimax } from "./services/minimax.js";
import { startOpenclaw, stopOpenclaw } from "./services/openclaw.js";

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
  },
  minimax: {
    name: "MiniMax",
    port: config.minimax.port,
    log: config.minimax.log,
    start: startMinimax,
    stop: stopMinimax,
  },
  openclaw: {
    name: "OpenClaw",
    port: config.openclaw.port,
    log: null,
    start: startOpenclaw,
    stop: stopOpenclaw,
  }
};

app.get("/api/status", async (req, res) => {
  const result = {};
  for (const [key, svc] of Object.entries(services)) {
    let status = "stopped";
    let pid = null;
    if (key === "openclaw") {
      const st = await dockerContainerState(config.openclaw.name);
      status = st === "not_found" ? "stopped" : st;
    } else {
      const open = await isPortOpen(svc.port);
      status = open ? "running" : "stopped";
      pid = open ? await pidByPort(svc.port) : null;
    }
    result[key] = { name: svc.name, status, port: svc.port, pid };
  }
  res.json(result);
});

app.post("/api/start/:name", async (req, res) => {
  const svc = services[req.params.name];
  if (!svc) return res.status(404).json({ error: "unknown service" });
  try {
    await svc.start();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post("/api/stop/:name", async (req, res) => {
  const svc = services[req.params.name];
  if (!svc) return res.status(404).json({ error: "unknown service" });
  try {
    await svc.stop();
    res.json({ ok: true });
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

const port = 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
