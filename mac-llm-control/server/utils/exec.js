import { exec as _exec } from "child_process";

export function exec(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    _exec(cmd, { shell: "/bin/bash", ...options }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}
