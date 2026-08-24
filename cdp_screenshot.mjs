const outFile = process.argv[2] || "cdp_shot.png";
const hash = process.argv[3] || null;
const waitMs = process.argv[4] ? parseInt(process.argv[4], 10) : 300;

const listRes = await fetch("http://localhost:9333/json/list");
const targets = await listRes.json();
const target = targets.find((t) => t.title === "CoolWeather") || targets[0];
if (!target) {
  console.error("No CoolWeather target found");
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 1;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve);
  ws.addEventListener("error", reject);
});

await send("Page.enable");
await send("Runtime.enable");

if (hash) {
  await send("Runtime.evaluate", {
    expression: `window.location.hash = ${JSON.stringify(hash)}`
  });
  await new Promise((r) => setTimeout(r, waitMs));
}

const { data } = await send("Page.captureScreenshot", { format: "png" });
const fs = await import("node:fs");
fs.writeFileSync(outFile, Buffer.from(data, "base64"));
console.log("saved", outFile);

ws.close();
process.exit(0);
