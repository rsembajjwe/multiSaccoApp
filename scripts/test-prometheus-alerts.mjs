import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const deployDirectory = path.join(root, "deploy");

try {
  const result = await execFileAsync("docker", [
    "run", "--rm",
    "--volume", `${deployDirectory}:/work:ro`,
    "--entrypoint", "/bin/promtool",
    "prom/prometheus:v3.5.0",
    "test", "rules", "/work/prometheus-alerts.test.yml"
  ], { windowsHide: true });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
} catch (error) {
  process.stderr.write(error.stdout || "");
  process.stderr.write(error.stderr || error.message);
  process.exitCode = 1;
}
