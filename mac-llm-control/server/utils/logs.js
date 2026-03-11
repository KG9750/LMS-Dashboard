import fs from "fs";
import { exec } from "./exec.js";

export async function tailFile(path, lines = 200) {
  if (!fs.existsSync(path)) return "";
  const { stdout } = await exec(`tail -n ${lines} "${path}"`);
  return stdout;
}
