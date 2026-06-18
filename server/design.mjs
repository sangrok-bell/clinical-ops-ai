// server/design.mjs — ② EDC design derivation (visit-level CRF + SoA). one-shot JSON.
// ePRO scale blocks are added deterministically on the client (must match live validate.ts),
// so this endpoint only does visit-level fields. No key/docs → SEED.
const MODEL = process.env.ANALYZE_MODEL || "claude-opus-4-8";
const EFFORT = process.env.DESIGN_EFFORT || "medium";

const SYSTEM = [
  "당신은 불면증 디지털치료제(CBT-I) 임상의 데이터 매니저 겸 EDC 설계자다.",
  "승인된 프로토콜·SOP에서 방문(Visit) 단위 CRF 필드와 평가 일정(SoA)을 도출한다.",
  "ePRO 척도 설문(ISI·ESS·PHQ-9·GAD-7)은 별도 처리하므로 제외한다.",
  "각 필드에 검증·탐지 규칙을 단다: L1=범위/형식, L2=척도 내적일관성, L3=교차소스(자가보고↔기기/임상측정), L5=코호트 이상치, L6=진정성, 안전=안전성 신호.",
  "특히 자가보고 불면(ISI) ↔ 스마트워치 측정 수면, PHQ-9 자살사고 ↔ AE 같은 교차소스(L3)·안전 점검을 반드시 포함하라.",
  "각 필드에는 그것이 구현하는 프로토콜 평가변수(endpoint)와 §출처를 단다. 없는 내용을 지어내지 말 것.",
  "한국어로.",
].join(" ");

const RULE = {
  type: "object",
  additionalProperties: false,
  properties: {
    layer: { type: "string", enum: ["L1", "L2", "L3", "L5", "L6", "안전"] },
    sev: { type: "string", enum: ["crit", "warn", "info"] },
    desc: { type: "string" },
  },
  required: ["layer", "sev", "desc"],
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          variable: { type: "string" },
          label: { type: "string" },
          type: { type: "string" },
          range: { type: "string" },
          required: { type: "boolean" },
          source: { type: "string" },
          endpoint: { type: "string" },
          rules: { type: "array", items: RULE },
        },
        required: ["variable", "label", "type", "range", "required", "source", "endpoint", "rules"],
      },
    },
    visits: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { label: { type: "string" }, assessments: { type: "array", items: { type: "string" } } },
        required: ["label", "assessments"],
      },
    },
  },
  required: ["summary", "fields", "visits"],
};

const SEED = {
  source: "seed",
  summary: "방문 CRF·SoA 기준 템플릿입니다. 승인 문서가 연결되면 v1.0에서 도출합니다.",
  fields: [
    { variable: "ISI_CLIN", label: "임상 확인 ISI", type: "정수", range: "0–28", required: true, source: "프로토콜 §방문", endpoint: "임상 평가", rules: [{ layer: "L3", sev: "crit", desc: "자가보고 ISI ↔ 임상 평가 불일치 점검" }, { layer: "L1", sev: "warn", desc: "0–28 범위 외" }] },
    { variable: "RESPONDER", label: "치료 반응(ISI ≥6점 감소; 관해 ISI<8)", type: "Y/N", range: "Y/N", required: true, source: "프로토콜 §7", endpoint: "1차: 반응률", rules: [{ layer: "L2", sev: "warn", desc: "ISI 변화량(≥6) 및 관해(ISI<8)와 반응 판정 일치" }] },
    { variable: "PHQ9_CLIN", label: "임상 우울 평가(PHQ-9)", type: "정수", range: "0–27", required: true, source: "프로토콜 §안전성", endpoint: "안전성 모니터링", rules: [{ layer: "안전", sev: "crit", desc: "PHQ-9 고위험/자살사고 시 ±7일 내 AE 연계 확인" }] },
    { variable: "WATCH_SYNC", label: "스마트워치 동기화 상태", type: "코드", range: "synced/missing", required: false, source: "기기 연동", endpoint: "객관 수면 소스(L3)", rules: [{ layer: "L3", sev: "warn", desc: "미동기화 시 ISI 교차검증 불가" }] },
  ],
  visits: [
    { label: "Week 0 (기저)", assessments: ["ISI", "ESS", "PHQ-9", "GAD-7", "스마트워치 동기화"] },
    { label: "Week 4", assessments: ["ISI", "PHQ-9", "스마트워치"] },
    { label: "Week 8 (1차 평가)", assessments: ["ISI(1차)", "PHQ-9", "스마트워치"] },
    { label: "Week 12 (종료)", assessments: ["ISI", "PHQ-9", "반응 판정"] },
  ],
};

function contentFor(docs) {
  const blocks = [];
  for (const d of docs) {
    const label = d.role === "sop" ? "데이터관리 SOP" : "임상시험 프로토콜";
    blocks.push({ type: "text", text: `[승인 문서 v1.0: ${label}${d.name ? " · " + d.name : ""}]` });
    if (d.kind === "pdf" && d.data) {
      blocks.push({ type: "document", source: { type: "base64", media_type: d.mediaType || "application/pdf", data: d.data } });
    } else if (d.text) {
      blocks.push({ type: "text", text: d.text.slice(0, 200000) });
    }
  }
  blocks.push({ type: "text", text: "위 승인 문서에서 방문 단위 CRF 필드(fields)와 평가 일정(visits)을 도출하라. ePRO 척도 설문(ISI·ESS·PHQ-9·GAD-7)은 제외. 각 필드에 L1–L6·안전 검증·탐지 규칙과 교차소스(L3)·안전 점검을 달아라." });
  return blocks;
}

export async function deriveDesign(body) {
  const docs = (body?.docs || []).filter((d) => d && (d.text || d.data));
  if (!process.env.ANTHROPIC_API_KEY || docs.length === 0) return SEED;
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: "user", content: contentFor(docs) }],
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: EFFORT },
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const parsed = JSON.parse(text);
    return { ...parsed, source: "ai", model: MODEL };
  } catch (e) {
    return { ...SEED, source: "seed", error: String(e) };
  }
}

export const handle = (body) => deriveDesign(body);
