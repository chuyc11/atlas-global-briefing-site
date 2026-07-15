import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

import {
  restorePreviousStaticAssets,
  snapshotCurrentStaticAssets,
} from "./preserve-live-assets.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");
const [command, ...rest] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node build/run-vinext.mjs <dev|build|start> [args...]");
  process.exit(2);
}

let assetSnapshot = null;
if (command === "build") {
  try {
    assetSnapshot = await snapshotCurrentStaticAssets(projectRoot);
  } catch (error) {
    console.warn(`Unable to snapshot live static assets: ${error.message}`);
  }
}

const child = spawn(process.execPath, [cli, command, ...rest], {
  cwd: projectRoot,
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH ?? ".wrangler/wrangler.log",
  },
  stdio: "inherit",
});

let finalized = false;
async function finish(code, signal) {
  if (finalized) return;
  finalized = true;
  if (command === "build") {
    try {
      await restorePreviousStaticAssets(projectRoot, assetSnapshot);
    } catch (error) {
      console.error(`Unable to restore previous static assets: ${error.message}`);
      code = 1;
    }
  }
  if (signal) console.error(`vinext stopped by ${signal}`);
  process.exit(code ?? 1);
}

child.on("error", (error) => {
  console.error(error.message);
  void finish(1);
});

child.on("exit", (code, signal) => {
  void finish(signal ? 1 : code, signal);
});
