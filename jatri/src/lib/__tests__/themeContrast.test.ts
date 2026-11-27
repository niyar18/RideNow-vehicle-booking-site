import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.resolve(process.cwd(), "src/app/globals.css"), "utf8");
function parseTheme(selector: string) {
  const block = css.split(selector + " {")[1]?.split("}")[0] || "";
  return Object.fromEntries([...block.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map(([, key, value]) => [key, value.trim()]));
}
const light = parseTheme(":root");
const dark = { ...light, ...parseTheme(".dark, html.dark") };
function hex(tokens: Record<string, string>, key: string): string {
  const value = tokens[key];
  if (value?.startsWith("var(")) return hex(tokens, value.slice(4, -1));
  if (!/^#[\da-f]{6}$/i.test(value || "")) throw new Error(`Unresolved color: ${key}`);
  return value;
}
function luminance(color: string) {
  const channels = [1, 3, 5].map((position) => {
    const sRGB = Number.parseInt(color.slice(position, position + 2), 16) / 255;
    return sRGB <= 0.04045 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function ratio(a: string, b: string) {
  const levels = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (levels[0] + .05) / (levels[1] + .05);
}

describe.each([["light", light], ["dark", dark]] as const)("WCAG 2.2 AA theme pairs in %s mode", (_, tokens) => {
  it.each([
    ["--text-primary", "--background", 4.5],
    ["--text-primary", "--surface-raised", 4.5],
    ["--text-secondary", "--surface", 4.5],
    ["--text-muted", "--surface-raised", 4.5],
    ["--accent-ink", "--surface-raised", 4.5],
    ["--action-fg", "--action-bg", 4.5],
    ["--on-primary", "--brand-primary", 4.5],
    ["--border-interactive", "--surface-raised", 3],
    ["--focus-ring", "--surface-raised", 3],
    ["--accent-mint", "--midnight", 4.5],
  ] as const)("%s on %s meets %s:1", (foreground, background, minimum) => {
    expect(ratio(hex(tokens, foreground), hex(tokens, background))).toBeGreaterThanOrEqual(minimum);
  });
});
