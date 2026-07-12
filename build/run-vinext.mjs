import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");
const [command, ...rest] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node build/run-vinext.mjs <dev|build|start> [args...]");
  process.exit(2);
}

const child = spawn(process.execPath, [cli, command, ...rest], {
  cwd: projectRoot,
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH ?? ".wrangler/wrangler.log",
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`vinext stopped by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
