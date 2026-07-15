/**
 * Generates placeholder icon.png (1024) and splash.png (2732) for Capacitor assets.
 * Usage: node scripts/generate-cap-resources.mjs family|guard
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const THEMES = {
  family: {
    bg: "#0F172A",
    accent: "#F97316",
    label: "F",
    sub: "STOS Family",
  },
  guard: {
    bg: "#0C1929",
    accent: "#2563EB",
    label: "G",
    sub: "STOS Guard",
  },
};

function svgIcon({ bg, accent, label, sub }) {
  return `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="180" fill="${bg}"/>
  <circle cx="512" cy="420" r="200" fill="${accent}" opacity="0.95"/>
  <text x="512" y="460" font-family="system-ui,sans-serif" font-size="220" font-weight="700" fill="white" text-anchor="middle">${label}</text>
  <text x="512" y="780" font-family="system-ui,sans-serif" font-size="64" font-weight="600" fill="#94A3B8" text-anchor="middle">${sub}</text>
</svg>`;
}

function svgSplash({ bg, accent, label, sub }) {
  return `<svg width="2732" height="2732" xmlns="http://www.w3.org/2000/svg">
  <rect width="2732" height="2732" fill="${bg}"/>
  <circle cx="1366" cy="1180" r="280" fill="${accent}" opacity="0.9"/>
  <text x="1366" y="1240" font-family="system-ui,sans-serif" font-size="320" font-weight="700" fill="white" text-anchor="middle">${label}</text>
  <text x="1366" y="1680" font-family="system-ui,sans-serif" font-size="96" font-weight="600" fill="#94A3B8" text-anchor="middle">${sub}</text>
</svg>`;
}

async function generate(app) {
  const theme = THEMES[app];
  if (!theme) throw new Error(`Unknown app: ${app}`);
  const outDir = path.join(ROOT, "apps", app, "resources");
  fs.mkdirSync(outDir, { recursive: true });

  await sharp(Buffer.from(svgIcon(theme))).png().toFile(path.join(outDir, "icon.png"));
  await sharp(Buffer.from(svgSplash(theme))).png().toFile(path.join(outDir, "splash.png"));
  console.log(`Generated ${outDir}/icon.png and splash.png`);
}

const app = process.argv[2] ?? "family";
await generate(app);
