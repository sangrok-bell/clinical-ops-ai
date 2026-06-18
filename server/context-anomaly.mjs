// server/context-anomaly.mjs — Feature: context-conditional anomaly AGENT (judge step).
// Given a deterministic candidate (value + patient context + the patient's own baseline),
// the LLM judges whether it's a genuine context-conditional anomaly worth a query, or
// explainable noise. AI prunes; deterministic layer already provided high recall. No key → keep candidate (low confidence).
const MODEL = process.env.ANALYZE_MODEL || "claude-opus-4-8";

const SYSTEM = [
  "당신은 임상 데이터 모니터링 보조자다.",
  "이미 규칙/통계로 걸러진 '맥락 조건부 이상 후보'를 받는다 — 전역 범위는 통과했으나 환자 본인의 맥락(음주·카페인·운동·스트레스) 또는 개인 추세 대비 어긋나 보이는 값이다.",
  "주어진 값·맥락·개인 기준선을 근거로, 이것이 진짜 맥락 대비 이상(context_anomaly)인지, 맥락상 설명 가능한 정상 변동(explainable)인지 판정하라.",
  "수치를 새로 만들지 말고 주어진 값만 인용한다. 한국어 1~2문장 rationale.",
].join(" ");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["context_anomaly", "explainable"] },
    confidence: { type: "string", enum: ["high", "low"] },
    rationale: { type: "string" },
  },
  required: ["verdict", "confidence", "rationale"],
};

export async function judgeContext(body) {
  const c = body?.candidate ?? body ?? {};
  if (!process.env.ANTHROPIC_API_KEY) {
    return { verdict: "context_anomaly", confidence: "low", rationale: `${c.msg ?? "맥락 대비 이상 후보"} (규칙 기반 후보 · AI 미연결)`, source: "seed" };
  }
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(c) }],
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: "low" },
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return { ...JSON.parse(text), source: "ai" };
  } catch (e) {
    return { verdict: "context_anomaly", confidence: "low", rationale: `${c.msg ?? "맥락 대비 이상 후보"} (AI 호출 실패 — 사람 검토)`, source: "seed" };
  }
}

export const handle = (body) => judgeContext(body);
