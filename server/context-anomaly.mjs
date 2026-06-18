// server/context-anomaly.mjs — Feature: context-conditional anomaly AGENT (judge step).
// Given a deterministic candidate (value + patient context + the patient's own baseline),
// the LLM judges whether it's a genuine context-conditional anomaly worth a query, or
// explainable noise. AI prunes; deterministic layer already provided high recall. No key → keep candidate (low confidence).
//
// Two paths share this module:
//   • LIGHT (batch/single): body = { candidate }            → judgeContext  (one json_schema call)
//   • AGENT (deep):         body = { mode:"agent", candidate, patient } → agentJudge (tool-use loop + critic)
// handle(body) routes on body.mode.
import { runAgent } from "./agent.mjs";
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

// ─────────────────────────────────────────────────────────────────────────────
// AGENT MODE (deep) — grounding tools over the patient's own data + a critic pass.
// The model can only cite numbers the deterministic tools return; it cannot invent.
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_SYSTEM = [
  "너는 맥락 조건부 이상 판정 에이전트다.",
  "도구로 환자 본인 기준선·교차소스·추세를 조회해 근거를 모은 뒤, 반드시 submit_verdict로 끝내라.",
  "수치를 지어내지 말고 도구 결과만 인용. rationale은 한국어 1~2문장.",
].join(" ");

const AGENT_TOOLS = [
  {
    name: "patient_baseline",
    description:
      "환자 본인의 수면일지(diary) 기준선(평균·표준편차·표본수)을 맥락별로 조회한다. context='good'(금주·무카페인·스트레스 비'상') / 'bad'(음주 또는 카페인 또는 스트레스'상') / 'all'.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        metric: { type: "string", enum: ["sol_min", "waso_min", "tst_min", "quality"] },
        context: { type: "string", enum: ["good", "bad", "all"] },
      },
      required: ["metric", "context"],
    },
  },
  {
    name: "cross_source",
    description: "특정 날짜의 다중 소스 뷰: 그날 수면일지 행 + 같은 날 스마트워치 요약 + ISI ePRO 값.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { date: { type: "string", description: "YYYY-MM-DD" } },
      required: ["date"],
    },
  },
  {
    name: "recent_trend",
    description:
      "후보 날짜 이전 최근 <window>일의 롤링 평균·표준편차를 조회한다. metric='isi_total'이면 ISI ePRO, 그 외(resting_hr 등)는 스마트워치 일별 지표.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        metric: { type: "string", description: "isi_total | resting_hr | avg_hr | hrv | sleep_min 등" },
        window: { type: "number", description: "되돌아볼 일수 (예: 21)" },
      },
      required: ["metric", "window"],
    },
  },
  {
    name: "submit_verdict",
    description: "근거 수집을 마친 뒤 최종 판정을 제출한다. 반드시 이 도구로 끝내라.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        verdict: { type: "string", enum: ["context_anomaly", "explainable"] },
        confidence: { type: "string", enum: ["high", "low"] },
        rationale: { type: "string" },
      },
      required: ["verdict", "confidence", "rationale"],
    },
  },
];

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
function statsOf(xs) {
  if (xs.length === 0) return { mean: null, sd: null, n: 0 };
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
  return { mean: +m.toFixed(1), sd: +sd.toFixed(1), n: xs.length };
}
const isGood = (r) => r.alcohol === "N" && r.caffeine === "N" && r.stress !== "상";
const isBad = (r) => r.alcohol === "Y" || r.caffeine === "Y" || r.stress === "상";

function buildToolImpls(patient, candidate) {
  const diary = Array.isArray(patient?.diary) ? patient.diary : [];
  const isi = Array.isArray(patient?.isi) ? patient.isi : [];
  const watch = Array.isArray(patient?.watch) ? patient.watch : [];
  return {
    patient_baseline: ({ metric, context }) => {
      const rows =
        context === "good" ? diary.filter(isGood) : context === "bad" ? diary.filter(isBad) : diary;
      const xs = rows.map((r) => num(r?.[metric])).filter((v) => v != null);
      return { metric, context, ...statsOf(xs) };
    },
    cross_source: ({ date }) => ({
      date,
      diary: diary.find((r) => r.date === date) ?? null,
      watch_daily: watch.find((r) => r.date === date) ?? null,
      isi_epro: (() => {
        const hit = isi.find((r) => r.date === date);
        return hit ? num(hit.isi_total) : null;
      })(),
    }),
    recent_trend: ({ metric, window }) => {
      const w = Number(window) > 0 ? Number(window) : 21;
      const date = candidate?.date ?? "";
      const useIsi = metric === "isi_total";
      const rows = (useIsi ? isi : watch)
        .filter((r) => (date ? r.date < date : true))
        .slice(-w);
      const key = useIsi ? "isi_total" : metric;
      const xs = rows.map((r) => num(r?.[key])).filter((v) => v != null);
      return { metric, window: w, before: date, ...statsOf(xs) };
    },
  };
}

const CRITIC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { refuted: { type: "boolean" }, note: { type: "string" } },
  required: ["refuted", "note"],
};

export async function agentJudge(body) {
  const c = body?.candidate ?? {};
  if (!process.env.ANTHROPIC_API_KEY) {
    return { verdict: "context_anomaly", confidence: "low", rationale: `${c.msg ?? "맥락 대비 이상 후보"} (규칙 기반 후보 · AI 미연결)`, trace: [], source: "seed" };
  }
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const toolImpls = buildToolImpls(body?.patient ?? {}, c);

    const { final, trace } = await runAgent({
      client,
      model: MODEL,
      system: AGENT_SYSTEM,
      user: JSON.stringify(c),
      tools: AGENT_TOOLS,
      toolImpls,
      maxSteps: 6,
      max_tokens: 700,
    });

    // No verdict from the loop → deterministic fallback (still surface the trace gathered).
    if (!final) {
      return { verdict: "context_anomaly", confidence: "low", rationale: `${c.msg ?? "맥락 대비 이상 후보"} (에이전트 미결 — 사람 검토)`, trace, source: "ai" };
    }

    // CRITIC: try to refute the verdict using context. If context explains it, refuted=true.
    let critic;
    try {
      const cm = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: "너는 반증 검토자다. 주어진 판정을 맥락상 반증하라 — 음주·카페인·운동·스트레스 등 맥락으로 설명 가능하면 refuted=true, 아니면 false. note는 한국어 1문장.",
        messages: [{ role: "user", content: `후보: ${JSON.stringify(c)}\n\n판정: ${JSON.stringify(final)}\n\n이 판정을 반증하라 — 맥락상 설명 가능하면 refuted=true.` }],
        output_config: { format: { type: "json_schema", schema: CRITIC_SCHEMA }, effort: "low" },
      });
      const ctext = cm.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      critic = JSON.parse(ctext);
    } catch {
      critic = undefined;
    }

    let confidence = final.confidence;
    let rationale = final.rationale;
    if (critic?.refuted && final.verdict === "context_anomaly") {
      confidence = "low"; // keep the verdict, but downgrade — the critic found a contextual explanation.
      rationale = `${rationale} (반증 검토: ${critic.note})`;
    }

    return { verdict: final.verdict, confidence, rationale, trace, critic, source: "ai" };
  } catch {
    return { verdict: "context_anomaly", confidence: "low", rationale: `${c.msg ?? "맥락 대비 이상 후보"} (AI 호출 실패 — 사람 검토)`, trace: [], source: "seed" };
  }
}

export const handle = (body) => (body?.mode === "agent" ? agentJudge(body) : judgeContext(body));
