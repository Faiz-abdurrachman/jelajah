import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const rawDirectory = path.join(webRoot, "public", "demo", "raw");
const rawOutputPath = path.join(webRoot, "public", "demo", "jelajah-level3-demo.raw.webm");
const webmOutputPath = path.join(webRoot, "public", "demo", "jelajah-level3-demo.webm");
const outputPath = path.join(webRoot, "public", "demo", "jelajah-level3-demo.mp4");
const liveUrl = process.env.DEMO_BASE_URL ?? "https://jelajah-stellar.vercel.app";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

await rm(rawDirectory, { recursive: true, force: true });
await mkdir(rawDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: {
    dir: rawDirectory,
    size: { width: 1280, height: 720 },
  },
});
const page = await context.newPage();
const video = page.video();

async function navigate(url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(2_000);
}

async function chapter(title, subtitle, durationMs) {
  await page.evaluate(
    ({ chapterTitle, chapterSubtitle }) => {
      document.querySelector("[data-demo-chapter]")?.remove();
      const card = document.createElement("section");
      card.dataset.demoChapter = "true";
      card.style.cssText = [
        "position:fixed",
        "left:32px",
        "bottom:28px",
        "z-index:2147483647",
        "max-width:760px",
        "padding:18px 22px",
        "border:1px solid rgba(255,255,255,.22)",
        "border-radius:16px",
        "background:rgba(10,15,30,.92)",
        "box-shadow:0 18px 60px rgba(0,0,0,.35)",
        "color:white",
        "font-family:Inter,system-ui,sans-serif",
      ].join(";");
      card.innerHTML = `<strong style="display:block;font-size:24px;line-height:1.25">${chapterTitle}</strong><span style="display:block;margin-top:6px;font-size:15px;line-height:1.5;color:#cbd5e1">${chapterSubtitle}</span>`;
      document.body.appendChild(card);
    },
    { chapterTitle: title, chapterSubtitle: subtitle },
  );
  await page.waitForTimeout(durationMs);
}

try {
  await navigate(liveUrl);
  await chapter(
    "JELAJAH — Stellar Level 3",
    "Production demo on Stellar Testnet: real-world hunts, XLM escrow, reputation XP, and live Soroban events.",
    8_000,
  );

  await navigate(`${liveUrl}/wallet`);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  await chapter(
    "Real-time Soroban event stream",
    "The frontend receives factory, hunt, registration, and XP events through cursor-based Server-Sent Events with reconnect support.",
    14_000,
  );

  await navigate(
    "https://stellar.expert/explorer/testnet/contract/CASEPHHQ2CCI2CXLW4BW5GPMJ4DBRB4ECJ453FLNEUFJEKS47UURFSM2",
  );
  await chapter(
    "Inter-contract architecture deployed",
    "HuntFactory deploys HuntInstance contracts and registers each hunt with the trusted Reputation contract.",
    10_000,
  );

  await navigate(
    "https://stellar.expert/explorer/testnet/tx/619042c261559c4b0337657c3c8e7dc36df3b0cf9707eeba677b2b4836304c41",
  );
  await chapter(
    "Atomic payout + reputation proof",
    "This successful Testnet transaction pays the hunter and awards 100 XP in the same contract flow.",
    12_000,
  );

  await navigate(
    "https://github.com/Faiz-abdurrachman/jelajah/actions/runs/33130457709",
  );
  await chapter(
    "CI pipeline: web and contracts passed",
    "The pipeline builds the production frontend and three WASMs, then runs 23 Playwright and 19 Rust contract tests.",
    10_000,
  );

  await navigate(
    pathToFileURL(path.join(webRoot, "public", "screenshots", "level-3", "test-output.png")).href,
  );
  await chapter(
    "23 frontend tests passed",
    "Browser flows, wallet security, error recovery, XLM payments, and live contract events are covered.",
    10_000,
  );

  await navigate(liveUrl);
  await chapter(
    "Hidden. Hunted. Claimed.",
    "Contract addresses, transaction hashes, deployment manifests, setup instructions, and evidence are available in the public repository.",
    6_000,
  );
} finally {
  await context.close();
  await browser.close();
}

if (!video) {
  throw new Error("Playwright did not create a video artifact");
}

await rm(rawOutputPath, { force: true });
await rename(await video.path(), rawOutputPath);
await rm(rawDirectory, { recursive: true, force: true });

await rm(webmOutputPath, { force: true });
await run("ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "warning",
  "-y",
  "-i",
  rawOutputPath,
  "-c",
  "copy",
  "-reserve_index_space",
  "200000",
  "-cues_to_front",
  "1",
  webmOutputPath,
]);

await rm(outputPath, { force: true });
await run("ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "warning",
  "-y",
  "-i",
  rawOutputPath,
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-crf",
  "24",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  outputPath,
]);
await rm(rawOutputPath, { force: true });
console.log(`${webmOutputPath}\n${outputPath}`);
