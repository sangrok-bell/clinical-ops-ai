import { handle } from "../server/design.mjs";

export const config = { maxDuration: 60 };

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  try {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(await handle(readBody(req))));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
