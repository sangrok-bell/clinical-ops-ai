import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// dev-only API: same server/*.mjs logic that Vercel exposes as functions in prod.
// `vite preview` / static build do NOT run this — there the Vercel functions handle /api/*.
function clinicalApi(): Plugin {
  const routes: Record<string, () => Promise<any>> = {
    "/api/explain": () => import("./server/explain.mjs"),
    "/api/analyze-protocol": () => import("./server/analyze.mjs"),
    "/api/reevaluate": () => import("./server/reevaluate.mjs"),
    "/api/derive-design": () => import("./server/design.mjs"),
    "/api/check-field-scope": () => import("./server/scope.mjs"),
  };
  return {
    name: "clinical-api",
    configureServer(server) {
      for (const [path, load] of Object.entries(routes)) {
        server.middlewares.use(path, (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end();
            return;
          }
          let body = "";
          req.on("data", (c) => (body += c));
          req.on("end", async () => {
            try {
              const mod: any = await load();
              const parsed = JSON.parse(body || "{}");
              if (typeof mod.handleStream === "function") {
                // module owns its content-type + NDJSON stream
                await mod.handleStream(parsed, res);
              } else {
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify(await mod.handle(parsed)));
              }
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // promote .env / .env.local to process.env (server-only; never reaches the browser)
  const env = loadEnv(mode, process.cwd(), "");
  for (const k of ["ANTHROPIC_API_KEY", "EXPLAIN_MODEL", "ANALYZE_MODEL"]) {
    if (env[k] && !process.env[k]) process.env[k] = env[k];
  }
  return {
    plugins: [react(), tailwindcss(), clinicalApi()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
  };
});
