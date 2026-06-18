#!/usr/bin/env node
/* Aurora — Tier 0 deterministic eval gate.
   Run: `npm run eval`  (or `node eval/check.mjs`)
   Verifies code + spec suite are internally consistent and build-clean.
   Exits non-zero on any failure so it can gate CI / pre-commit / the Spec Loop. */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const rel = (p) => p.replace(ROOT + "/", "");
let failures = 0;
const fail = (m) => { failures++; console.log("  \x1b[31m✗\x1b[0m " + m); };
const ok = (m) => console.log("  \x1b[32m✓\x1b[0m " + m);
const head = (t) => console.log("\n\x1b[1m" + t + "\x1b[0m");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ── 1. type check ───────────────────────────────────────────────
head("1. Type check (tsc)");
try {
  execSync("npm run typecheck", { cwd: ROOT, stdio: "pipe" });
  ok("tsc passed — no type errors");
} catch (e) {
  fail("tsc errors:\n" + (e.stdout?.toString() || e.stderr?.toString() || e.message));
}

// ── 2. spec cross-link integrity ────────────────────────────────
head("2. Spec cross-link integrity");
const specDir = join(ROOT, "spec");
if (!existsSync(specDir)) {
  fail("spec/ not found");
} else {
  let links = 0, broken = 0;
  const files = walk(specDir).filter((f) => f.endsWith(".md") && !f.includes("/_templates/"));
  for (const file of files) {
    // strip fenced + inline code so example links inside `code` aren't checked
    const txt = readFileSync(file, "utf8")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]*`/g, "");
    const re = /\]\(([^)\s]+\.md)(?:#[^)]*)?\)/g;
    let m;
    while ((m = re.exec(txt))) {
      if (m[1].startsWith("http")) continue;
      links++;
      if (!existsSync(resolve(dirname(file), m[1]))) { broken++; fail(`${rel(file)} → ${m[1]} (missing)`); }
    }
  }
  if (broken === 0) ok(`${links} spec links across ${files.length} files all resolve`);
}

// ── 3. component spec ⇄ source conformance ──────────────────────
head("3. Component spec ⇄ source conformance");
const MANIFEST = [
  { spec: "spec/components/button.md", src: "src/components/ui/button.tsx", exports: ["Button", "buttonVariants"] },
  { spec: "spec/components/badge.md", src: "src/components/ui/badge.tsx", exports: ["CountPill", "Dot"] },
  { spec: "spec/components/card.md", src: "src/components/ui/card.tsx", exports: ["Card"] },
  { spec: "spec/components/media.md", src: "src/components/ui/media.tsx", exports: ["Avatar", "Thumbnail"] },
  { spec: "spec/components/toast.md", src: "src/components/ui/toast.tsx", exports: ["Toast"] },
  { spec: "spec/components/nav.md", src: "src/components/ui/nav.tsx", exports: ["NavItem", "SectionLabel", "Tab", "IconButton"] },
  { spec: "spec/components/sidebar.md", src: "src/components/Sidebar.tsx", exports: ["Sidebar"] },
  { spec: "spec/components/floating-toolbar.md", src: "src/components/FloatingToolbar.tsx", exports: ["FloatingToolbar"] },
  { spec: "spec/components/notification-panel.md", src: "src/components/NotificationPanel.tsx", exports: ["NotificationPanel"] },
  { spec: "spec/components/toast-stack.md", src: "src/components/ToastStack.tsx", exports: ["ToastStack"] },
  { spec: "spec/components/app-shell.md", src: "src/App.tsx", exports: ["default"] },
];
for (const e of MANIFEST) {
  if (!existsSync(join(ROOT, e.spec))) { fail(`spec missing: ${e.spec}`); continue; }
  if (!existsSync(join(ROOT, e.src))) { fail(`source missing: ${e.src} (per ${e.spec})`); continue; }
  const code = readFileSync(join(ROOT, e.src), "utf8");
  const missing = e.exports.filter((s) => {
    if (s === "default") return !/export\s+default/.test(code);
    return !(new RegExp(`export\\s+(?:function|const|class)\\s+${s}\\b`).test(code) ||
             new RegExp(`export\\s*\\{[^}]*\\b${s}\\b`).test(code));
  });
  if (missing.length) fail(`${e.src} missing exports: ${missing.join(", ")} (per ${e.spec})`);
  else ok(`${e.src} ⇄ ${rel(join(ROOT, e.spec))}`);
}

// ── 4. token canon ⇄ src/index.css (no drift) ───────────────────
head("4. Design-token canon ⇄ src/index.css");
const cssPath = join(ROOT, "src/index.css");
const css = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";
if (!css) fail("src/index.css not found");
const EXPECTED = {
  "--color-": ["canvas", "surface", "sidebar", "elevated", "ink", "dim", "icon", "onaccent", "brand", "positive", "info", "magenta", "danger", "warning", "caution"],
  "--radius-": ["card", "toast", "btn", "pill"],
  "--shadow-": ["card", "soft", "glow-green", "glow-blue", "glow-teal"],
};
const CUSTOM = [".bg-brand-gradient", ".bg-success-gradient", ".bg-info-gradient", ".bg-logo-sphere", ".glass", ".animate-toast-in"];
let tok = 0;
for (const [prefix, names] of Object.entries(EXPECTED))
  for (const n of names) if (!css.includes(prefix + n + ":")) { tok++; fail(`token ${prefix}${n} in canon but not in index.css`); }
for (const c of CUSTOM) if (!css.includes(c)) { tok++; fail(`custom utility ${c} missing from index.css`); }
if (tok === 0) ok(`${Object.values(EXPECTED).flat().length} theme tokens + ${CUSTOM.length} custom utilities present`);

// ── summary ─────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
if (failures === 0) { console.log("\x1b[32m\x1b[1mTIER 0 PASS\x1b[0m — code & specs are consistent.\n"); process.exit(0); }
console.log(`\x1b[31m\x1b[1mTIER 0 FAIL\x1b[0m — ${failures} issue(s). Fix code or spec (Reconcile), then re-run.\n`);
process.exit(1);
