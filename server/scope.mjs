// server/scope.mjs — Feature 21 scope guard. Judges whether a user-added CRF field is within
// the connected study's collection scope. AI warns/guides only (never blocks). No key → deterministic fallback.
const MODEL = process.env.ANALYZE_MODEL || "claude-opus-4-8";

const SYSTEM = [
  "당신은 임상 데이터 매니저(DM)다.",
  "승인된 프로토콜·SOP 요약/문맥을 기준으로, 제안된 CRF 필드/규칙이 이 연구의 수집 범위(평가변수·SoA·수집항목)에 부합하는지 판정하라.",
  "명확히 매핑되면 in_scope(maps_to에 해당 평가변수/§를 적는다), 관련은 있으나 근거가 약하거나 불명확하면 caution, 프로토콜·SOP에 근거가 전혀 없으면 out_of_scope로 판정하라.",
  "지어내지 말 것. rationale은 한국어 1~2문장.",
].join(" ");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["in_scope", "caution", "out_of_scope"] },
    confidence: { type: "string", enum: ["high", "low"] },
    rationale: { type: "string" },
    maps_to: { type: "string" },
    suggested_source: { type: "string" },
  },
  required: ["verdict", "confidence", "rationale"],
};

const TOKENS = ["isi", "ess", "phq", "gad", "수면", "sleep", "watch", "워치", "tst", "waso", "sol", "각성", "졸림", "우울", "불안", "심박", "hrv", "spo2", "코골이", "ahi", "호흡", "불면"];

function fallback(field, study) {
  const hay = `${field?.variable ?? ""} ${field?.label ?? ""} ${field?.endpoint ?? ""}`.toLowerCase();
  const measures = (study?.measures ?? []).map((m) => String(m).toLowerCase());
  const hit = TOKENS.some((t) => hay.includes(t)) || measures.some((m) => m.length >= 2 && hay.includes(m.slice(0, 3)));
  return hit
    ? { verdict: "in_scope", confidence: "low", rationale: "연결 스터디 측정치(불면·수면·기분 척도·스마트워치)와 용어가 겹칩니다.", maps_to: `${study?.label ?? "연결 스터디"} 수집 항목`, source: "seed" }
    : { verdict: "caution", confidence: "low", rationale: "연결 스터디 측정치와 직접 겹치는 근거를 찾지 못했습니다 — 프로토콜·SOP 근거를 확인하세요.", source: "seed" };
}

export async function scopeCheck(body) {
  const field = body?.field ?? {};
  const study = body?.study ?? {};
  const context = body?.context ?? {};
  if (!process.env.ANTHROPIC_API_KEY) return fallback(field, study);
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const user = `연결 스터디: ${JSON.stringify(study)}\n\n승인 문서 맥락: ${JSON.stringify(context)}\n\n제안 필드: ${JSON.stringify(field)}`;
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: "low" },
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return { ...JSON.parse(text), source: "ai" };
  } catch {
    return fallback(field, study);
  }
}

export const handle = (body) => scopeCheck(body);
