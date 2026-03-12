import React, { useEffect, useState } from "react";

const API = "http://localhost:3001";

const statusColor = (status) => {
  if (status === "running") return "bg-emerald-500/20 text-emerald-300";
  if (status && status.startsWith("Up")) return "bg-emerald-500/20 text-emerald-300";
  if (status === "stopped" || status === "not_found") return "bg-rose-500/20 text-rose-300";
  return "bg-amber-500/20 text-amber-300";
};

function ServiceCard({ name, data, onStart, onStop, onRestart, onLogs }) {
  const running = data.status === "running" || (data.status && data.status.startsWith("Up"));
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{name}</h3>
        <span className={`badge ${statusColor(data.status)}`}>{data.status || "unknown"}</span>
      </div>
      <div className="text-sm text-slate-300 space-y-1">
        <div>Port: <span className="text-slate-100">{data.port || "-"}</span></div>
        <div>PID: <span className="text-slate-100">{data.pid || "-"}</span></div>
        {data.tokens?.total !== undefined && (
          <div>Tokens: <span className="text-slate-100">{data.tokens.total}</span></div>
        )}
        {data.docker?.containerState && (
          <div>Container: <span className="text-slate-100">{data.docker.containerState}</span></div>
        )}
        {data.docker?.startedAt && (
          <div>Started: <span className="text-slate-100">{data.docker.startedAt}</span></div>
        )}
        {data.docker?.healthStatus && (
          <div>Health: <span className="text-slate-100">{data.docker.healthStatus}</span></div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          className={`px-3 py-1 rounded ${running ? "bg-slate-700 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500"}`}
          onClick={onStart}
          disabled={running}
        >
          Start
        </button>
        <button
          className={`px-3 py-1 rounded ${!running ? "bg-slate-700 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-500"}`}
          onClick={onStop}
          disabled={!running}
        >
          Stop
        </button>
        <button className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600" onClick={onRestart}>Restart</button>
        {onLogs && (
          <button className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500" onClick={onLogs}>Logs</button>
        )}
      </div>
    </div>
  );
}

function MachineCard({ machine }) {
  const onlineChannels = (machine.channels || []).filter(c => c.status === "online");
  const bot = onlineChannels[0]?.botName || onlineChannels[0]?.channel || "-";
  const model = machine.model || "-";
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{machine.name}</h3>
        <span className={`badge ${machine.docker?.containerState === "running" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
          {machine.docker?.containerState || (machine.error ? "error" : "no-docker")}
        </span>
      </div>
      {machine.error ? (
        <div className="text-sm text-rose-300">{machine.error}</div>
      ) : (
        <div className="text-sm text-slate-300 space-y-1">
          <div>Model: <span className="text-slate-100">{model}</span></div>
          <div>Bot: <span className="text-slate-100">{bot}</span></div>
          {machine.docker?.healthStatus && (
            <div>Health: <span className="text-slate-100">{machine.docker.healthStatus}</span></div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState({});
  const [logs, setLogs] = useState("");
  const [logTitle, setLogTitle] = useState("");
  const [message, setMessage] = useState("");
  const [machines, setMachines] = useState([]);

  const fetchStatus = async () => {
    const res = await fetch(`${API}/api/status`);
    const json = await res.json();
    setStatus(json);
  };

  const refreshHealth = async () => {
    await fetchStatus();
  };

  const call = async (path) => {
    const res = await fetch(`${API}${path}`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error || "操作失败");
    } else if (json?.message) {
      setMessage(json.message);
    } else {
      setMessage("操作已执行");
    }
    setTimeout(fetchStatus, 1000);
  };

  const fetchLogs = async (name) => {
    const res = await fetch(`${API}/api/logs/${name}`);
    const json = await res.json();
    setLogs(json.logs || "");
    setLogTitle(name);
  };

  const rssToGb = (rssKb) => {
    if (rssKb === null || rssKb === undefined) return "-";
    const gb = Number(rssKb) / (1024 * 1024);
    return gb.toFixed(2);
  };

  const fetchMachines = async () => {
    const res = await fetch(`${API}/api/machines`);
    const json = await res.json();
    setMachines(json.machines || []);
  };

  useEffect(() => {
    fetchStatus();
    fetchMachines();
    const t = setInterval(() => {
      fetchStatus();
      fetchMachines();
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mac LLM Control</h1>
            <p className="text-slate-400 text-sm">本地模型与 OpenClaw 控制面板</p>
          </div>
          <button
            className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-sm"
            onClick={async () => {
              await fetch(`${API}/api/shutdown`, { method: "POST" });
              setMessage("后端已关闭（3001 释放）。前端仍在运行，需手动停止 dev:web。");
            }}
          >
            Close Dashboard
          </button>
        </div>

        {message && (
          <div className="card text-sm text-slate-200 bg-slate-800/60 border-slate-700">
            {message}
          </div>
        )}

        {/* 第一行：多机器 OpenClaw/Docker */}
        <div>
          <h2 className="text-sm text-slate-400 mb-2">机器与 OpenClaw</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {machines.map((m) => (
              <MachineCard key={m.id} machine={m} />
            ))}
          </div>
        </div>

        {/* 第二行：本地模型 */}
        <div>
          <h2 className="text-sm text-slate-400 mb-2">本地模型</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(status)
              .filter(([key]) => key !== "openclaw")
              .map(([key, svc]) => (
                <ServiceCard
                  key={key}
                  name={svc.name}
                  data={svc}
                  onStart={() => call(`/api/start/${key}`)}
                  onStop={() => call(`/api/stop/${key}`)}
                  onRestart={() => call(`/api/restart/${key}`)}
                  onLogs={() => fetchLogs(key)}
                />
              ))}
          </div>
        </div>

        {/* 第三行：健康检查 */}
        <div>
          <h2 className="text-sm text-slate-400 mb-2">健康检查</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(status).map(([key, svc]) => (
              <div key={`health-${key}`} className="card">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">健康检查: {svc.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${svc.health ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                      {svc.health ? `HTTP ${svc.health}` : "N/A"}
                    </span>
                    <button className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs" onClick={refreshHealth}>
                      刷新
                    </button>
                  </div>
                </div>
                <div className="text-sm text-slate-300 mt-2 space-y-1">
                  <div>CPU: <span className="text-slate-100">{svc.usage?.cpu ?? "-"}%</span></div>
                  <div>MEM: <span className="text-slate-100">{svc.usage?.mem ?? "-"}%</span></div>
                  <div>RSS: <span className="text-slate-100">{rssToGb(svc.usage?.rss)} GB</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Logs: {logTitle || "-"}</h3>
            <button className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600" onClick={() => setLogs("")}>Clear</button>
          </div>
          <pre className="text-xs whitespace-pre-wrap text-slate-300 max-h-64 overflow-auto">{logs || "(empty)"}</pre>
        </div>
      </div>
    </div>
  );
}
