// server/reevaluate.mjs — ① "AI re-review" of a user rebuttal. one-shot JSON.
// LLM judges the rebuttal → withdrawn / upheld + short reason. Human has final say. No key → upheld seed.
const MODEL = process.env.ANALYZE_MODEL || "claude-opus-4-8";

const SYSTEM = [
  "임상 검토에서 제기된 지적(finding)에 대해 사용자가 반박했다.",
  "사용자의 반박 근거를 객관적으로 평가하라.",
  "반박이 타당해 지적이 더는 유효하지 않으면 verdict를 'withdrawn'으로,",
  "반박에도 불구하고 여전히 문제라면 'upheld'로 판단하라.",
  "한국어 1~2문장으로 근거를 설명한다. 아첨하지 말고 임상적으로 판단하라.",
].join(" ");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["withdrawn", "upheld"] },
    explanation: { type: "string" },
  },
  required: ["verdict", "explanation"],
};

export async function reevaluateFinding(body) {
  const finding = body?.finding ?? {};
  const rebuttal = body?.rebuttal ?? "";
  if (!process.env.ANTHROPIC_API_KEY) return { verdict: "upheld", explanation: "(키 없음) 자동 재검토 불가 — 사람 판단으로 처리하세요.", source: "seed" };
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: "user", content: `원래 지적:\n${JSON.stringify(finding)}\n\n사용자 반박:\n${rebuttal}` }],
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: "low" },
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return { ...JSON.parse(text), source: "ai" };
  } catch (e) {
    return { verdict: "upheld", explanation: "재검토 호출 실패 — 사람 판단으로 처리하세요.", source: "seed" };
  }
}

export const handle = (body) => reevaluateFinding(body);
