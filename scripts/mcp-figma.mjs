import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const settingsPath = path.join(repoRoot, ".vscode", "settings.json");
const command = process.argv[2] ?? "doctor";

const EXPECTED_SETTINGS = {
  "mcpFigma.websocketPort": 3055,
  "mcpFigma.autoStartWebSocket": false,
  "mcpFigma.enableStatusBar": true,
  "mcpFigma.aiAssistant": "cursor",
};

function logLine(label, ok, details) {
  const marker = ok ? "[ok]" : "[warn]";
  console.log(`${marker} ${label}: ${details}`);
}

function describePortFailure(errorCode) {
  if (errorCode === "EPERM") {
    return "connection attempt blocked by the current environment (EPERM)";
  }

  if (errorCode === "ECONNREFUSED") {
    return "no process is listening on the configured port (ECONNREFUSED)";
  }

  if (errorCode === "TIMEOUT") {
    return "connection attempt timed out";
  }

  return `endpoint is not reachable (${errorCode ?? "CLOSED"})`;
}

function parseMajor(version) {
  return Number.parseInt(version.replace(/^v/, "").split(".")[0] ?? "0", 10);
}

async function loadWorkspaceSettings() {
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (open, errorCode = null) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve({ open, errorCode });
    };

    socket.setTimeout(750);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false, "TIMEOUT"));
    socket.once("error", (error) => finish(false, error.code ?? "ERROR"));
    socket.connect(port, "127.0.0.1");
  });
}

async function runDoctor() {
  const nodeMajor = parseMajor(process.version);
  const nodeOk = nodeMajor >= 18;
  logLine("Node.js", nodeOk, `${process.version} detected (requires 18+)`);

  const settings = await loadWorkspaceSettings();
  const settingsOk = settings !== null;
  logLine(
    "Workspace settings",
    settingsOk,
    settingsOk ? `Loaded ${path.relative(repoRoot, settingsPath)}` : "Missing .vscode/settings.json",
  );

  const port = settings?.["mcpFigma.websocketPort"] ?? EXPECTED_SETTINGS["mcpFigma.websocketPort"];

  if (settingsOk) {
    for (const [key, expectedValue] of Object.entries(EXPECTED_SETTINGS)) {
      const actualValue = settings[key];
      const matches = actualValue === expectedValue;
      logLine(key, matches, `expected ${JSON.stringify(expectedValue)}, found ${JSON.stringify(actualValue)}`);
    }
  }

  const portStatus = await checkPort(port);
  logLine(
    "WebSocket endpoint",
    portStatus.open,
    portStatus.open
      ? `127.0.0.1:${port} is accepting connections`
      : `127.0.0.1:${port}: ${describePortFailure(portStatus.errorCode)}`,
  );

  console.log("");
  console.log("Repo-local scope:");
  console.log("- This project can validate MCP Figma prerequisites and workspace defaults.");
  console.log("- Installing the VS Code extension, configuring assistant-specific MCP files, and installing the Figma plugin remain external/manual steps.");

  process.exit(nodeOk && settingsOk ? 0 : 1);
}

async function runStrictTest() {
  const settings = await loadWorkspaceSettings();
  const port = settings?.["mcpFigma.websocketPort"] ?? EXPECTED_SETTINGS["mcpFigma.websocketPort"];
  const portStatus = await checkPort(port);

  if (portStatus.open) {
    console.log(`MCP Figma WebSocket endpoint is reachable at ws://127.0.0.1:${port}.`);
    process.exit(0);
  }

  console.error(
    `MCP Figma WebSocket endpoint is not reachable at ws://127.0.0.1:${port}: ${describePortFailure(portStatus.errorCode)}.`,
  );
  process.exit(1);
}

if (command === "doctor") {
  await runDoctor();
} else if (command === "test") {
  await runStrictTest();
} else {
  console.error(`Unknown command "${command}". Use "doctor" or "test".`);
  process.exit(1);
}
