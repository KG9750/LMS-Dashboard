import fs from "fs";
import path from "path";

function addUsage(total, usage) {
  if (!usage) return;
  const input = usage.input ?? usage.inputTokens ?? 0;
  const output = usage.output ?? usage.outputTokens ?? 0;
  const cacheRead = usage.cacheRead ?? 0;
  const cacheWrite = usage.cacheWrite ?? 0;
  const totalTokens = usage.totalTokens ?? usage.total ?? (input + output + cacheRead + cacheWrite);

  total.input += Number(input) || 0;
  total.output += Number(output) || 0;
  total.cacheRead += Number(cacheRead) || 0;
  total.cacheWrite += Number(cacheWrite) || 0;
  total.total += Number(totalTokens) || 0;
}

export function sumTokensInSessions(dir) {
  const total = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 };
  try {
    if (!fs.existsSync(dir)) return total;
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".jsonl"));
    for (const file of files) {
      const full = path.join(dir, file);
      const content = fs.readFileSync(full, "utf8");
      const lines = content.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          const usage = obj?.usage || obj?.message?.usage || obj?.message?.content?.usage;
          addUsage(total, usage);
        } catch {
          // ignore malformed lines
        }
      }
    }
  } catch {
    return total;
  }
  return total;
}
