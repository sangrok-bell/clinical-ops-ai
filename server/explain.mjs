// server/explain.mjs — advisory explanation for an ALREADY-detected finding. one-shot.
// Never computes/invents numbers; explains why suspicious + what to do. No key → deterministic template.
const MODEL = process.env.EXPLAIN_MODEL || "claude-opus-4-8";

const SYSTEM = [
  "당신은 임상 데이터 품질 알럿을 설명하는 보조자다.",
  "이미 규칙/통계로 탐지·계산된 finding(layer·severity·msg 등)을 받아,",
  "왜 의심되는지와 무엇을 해야 하는지를 한국어 1~2문장으로 설명한다.",
  "규칙: 수치를 새로 계산하거나 지어내지 말고 주어진 값만 인용한다.",
  "safety 건은 최우선 에스컬레이션(PI/메디컬 모니터 즉시 통보)을 권고한다.",
  "대상 독자는 데이터 매니저/CRA. 군더더기 없이.",
  "최종 설명 1~2문장만 출력하라. 사고 과정·서론·메타설명은 쓰지 말 것.",
].join(" ");

function template(f) {
  let action;
  if (f.cls === "safety" || f.safety) action = "즉시 안전 에스컬레이션이 필요합니다.";
  else if (f.sev === "crit" || f.severity === "critical") action = "환자 재확인 쿼리를 발송하세요.";
  else action = "검토 후 쿼리 또는 유지 처리하세요.";
  return `${f.layer ?? "검증"} 계층에서 "${f.msg ?? "이상"}"이(가) 탐지됐습니다. ${action}`;
}

export async function explainFinding(finding) {
  const f = finding ?? {};
  if (!process.env.ANTHROPIC_API_KEY) return { explanation: template(f), source: "template", model: null };
  try {
    const isHaiku = MODEL.includes("haiku");
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(f) }],
      ...(isHaiku ? {} : { output_config: { effort: "low" } }),
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    if (!text) return { explanation: template(f), source: "template", model: MODEL };
    return { explanation: text, source: "ai", model: MODEL };
  } catch (e) {
    return { explanation: template(f), source: "template", model: null };
  }
}

export const handle = (body) => explainFinding(body?.finding ?? body);
