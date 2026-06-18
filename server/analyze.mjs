// server/analyze.mjs — ① protocol/SOP analysis.
// Streaming (NDJSON) via handleStream + one-shot via handle. Claude only SURFACES
// candidate issues; numbers/dispositions are the human's job (UI). No key/docs → SEED.
const MODEL = process.env.ANALYZE_MODEL || "claude-opus-4-8";
const EFFORT = process.env.ANALYZE_EFFORT || "high";

const SYSTEM = [
  "당신은 임상시험 프로토콜·데이터관리 SOP 검토 전문가다.",
  "업로드된 문서를 분석해 운영 위험, 내부 모순, 임상적으로 부적합한 사유를 찾는다.",
  "프로토콜과 SOP가 함께 주어지면 둘 사이의 불일치도 점검한다.",
  "각 항목에는 임상적 근거(detail)와 구체적 제안 수정안(suggested_fix)을 단다.",
  "확신할 수 없으면 severity를 info로 낮추거나 생략한다. 없는 내용을 지어내지 말 것.",
  "또한 업로드된 문서가 임상시험 프로토콜 또는 데이터관리 SOP가 맞는지 판정해 doc_assessment에 담아라(is_target, confidence, doc_kind, reason). 프로토콜/SOP가 아니면 is_target=false로 하되, 분석은 막지 말고 사람이 판단하도록 신호만 남긴다.",
  "doc_assessment.therapeutic_area에 이 문서의 치료영역을 한국어로 적고(예: '불면증/수면', '금연/니코틴 의존', '우울증', '기타/불명'), doc_assessment.expected_measures에 이 프로토콜이 기대하는 핵심 측정도구·척도 목록을 적어라(예: ['ISI','ESS','PHQ-9','GAD-7','스마트워치 수면'] 또는 ['FTND','호기 CO','코티닌','금연 일수']).",
  "한국어로, 데이터 매니저/연구자가 바로 처리할 수 있게.",
].join(" ");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    doc_assessment: {
      type: "object",
      additionalProperties: false,
      properties: {
        is_target: { type: "boolean" },
        confidence: { type: "string", enum: ["high", "low"] },
        doc_kind: { type: "string" },
        reason: { type: "string" },
        therapeutic_area: { type: "string" },
        expected_measures: { type: "array", items: { type: "string" } },
      },
      required: ["is_target", "confidence", "doc_kind", "reason", "therapeutic_area", "expected_measures"],
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          severity: { type: "string", enum: ["critical", "warning", "info"] },
          category: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          suggested_fix: { type: "string" },
          source: { type: "string" },
        },
        required: ["id", "severity", "category", "title", "detail", "suggested_fix", "source"],
      },
    },
  },
  required: ["summary", "doc_assessment", "findings"],
};

const SEED = {
  source: "seed",
  summary: "분석 서비스에 연결하지 못해 표준 점검 항목을 표시합니다.",
  findings: [
    { id: "or1", severity: "critical", category: "표본", title: "표본 크기 부족", detail: "현재 24명 — 검정력 80%에 미달합니다.", suggested_fix: "군당 ≥34명(총 68명)으로 상향.", source: "프로토콜 §3" },
    { id: "or2", severity: "warning", category: "선정/제외", title: "선정/제외 기준 모호", detail: "ePRO 자가입력 불가자(인지장애·시력) 제외 기준이 없습니다.", suggested_fix: "자가입력 가능 여부를 제외 기준에 추가.", source: "프로토콜 §4" },
    { id: "or3", severity: "warning", category: "중도탈락", title: "중도 탈락 기준 불명확", detail: "며칠 미입력 시 중단인지 정의되지 않았습니다.", suggested_fix: "연속 7일/누적 14일 미입력 시 중단으로 정의.", source: "프로토콜 §5" },
    { id: "or4", severity: "critical", category: "SOP–프로토콜 불일치", title: "ePRO 작성창 불일치", detail: '프로토콜 "기상 후 1시간" vs SOP "오전 중".', suggested_fix: "두 문서의 작성창 정의를 일치시킬 것.", source: "프로토콜 §6.2 / SOP §3" },
  ],
};

function contentFor(docs) {
  const blocks = [];
  for (const d of docs) {
    const label = d.role === "sop" ? "데이터관리 SOP" : "임상시험 프로토콜";
    blocks.push({ type: "text", text: `[문서: ${label}${d.name ? " · " + d.name : ""}]` });
    if (d.kind === "pdf" && d.data) {
      blocks.push({ type: "document", source: { type: "base64", media_type: d.mediaType || "application/pdf", data: d.data } });
    } else if (d.text) {
      blocks.push({ type: "text", text: d.text.slice(0, 200000) });
    }
  }
  blocks.push({ type: "text", text: "위 문서를 분석해 운영 위험·모순·임상 부적합 사유를 findings로, 전체 한 줄 요약을 summary로 출력하라." });
  return blocks;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// incremental parser: a single JSON object {"summary":…,"findings":[…]} streams in;
// emit summary deltas + closed finding objects as soon as they appear. `done` is authoritative.
function makeParser(emit) {
  let sumStart = -1, sumEmitted = 0, sumClosed = false;
  let findStart = -1, scan = 0, depth = 0, inStr = false, esc = false, elemStart = -1;
  const decode = (s) => s.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  return function feed(buf) {
    if (!sumClosed) {
      if (sumStart < 0) {
        const k = buf.indexOf('"summary"');
        if (k >= 0) {
          const colon = buf.indexOf(":", k + 9);
          if (colon >= 0) {
            const q = buf.indexOf('"', colon + 1);
            if (q >= 0) sumStart = q + 1;
          }
        }
      }
      if (sumStart >= 0) {
        let out = "", closed = false, e = false;
        for (let i = sumStart; i < buf.length; i++) {
          const c = buf[i];
          if (e) { out += c; e = false; continue; }
          if (c === "\\") { out += c; e = true; continue; }
          if (c === '"') { closed = true; break; }
          out += c;
        }
        const decoded = decode(out);
        if (decoded.length > sumEmitted) {
          emit({ t: "summary", text: decoded.slice(sumEmitted) });
          sumEmitted = decoded.length;
        }
        if (closed) sumClosed = true;
      }
    }
    if (findStart < 0) {
      const k = buf.indexOf('"findings"');
      if (k >= 0) {
        const br = buf.indexOf("[", k + 10);
        if (br >= 0) { findStart = br; scan = br + 1; }
      }
    }
    if (findStart >= 0) {
      for (; scan < buf.length; scan++) {
        const c = buf[scan];
        if (inStr) {
          if (esc) esc = false;
          else if (c === "\\") esc = true;
          else if (c === '"') inStr = false;
          continue;
        }
        if (c === '"') { inStr = true; continue; }
        if (c === "{") { if (depth === 0) elemStart = scan; depth++; }
        else if (c === "}") {
          depth--;
          if (depth === 0 && elemStart >= 0) {
            try { emit({ t: "finding", finding: JSON.parse(buf.slice(elemStart, scan + 1)) }); } catch {}
            elemStart = -1;
          }
        }
      }
    }
  };
}

export async function handleStream(body, res) {
  res.setHeader("content-type", "application/x-ndjson; charset=utf-8");
  res.setHeader("cache-control", "no-cache");
  const emit = (obj) => res.write(JSON.stringify(obj) + "\n");
  const docs = (body?.docs || []).filter((d) => d && (d.text || d.data));
  const names = docs.map((d) => d.name).filter(Boolean).join(", ") || "문서";

  if (!process.env.ANTHROPIC_API_KEY || docs.length === 0) {
    emit({ t: "status", text: `문서 로드 · ${names}` });
    await sleep(350);
    emit({ t: "status", text: "검토 엔진 — 표준 점검 항목으로 진행" });
    await sleep(350);
    for (const ch of SEED.summary) { emit({ t: "summary", text: ch }); await sleep(8); }
    for (const f of SEED.findings) { await sleep(450); emit({ t: "finding", finding: f }); }
    await sleep(300);
    emit({ t: "done", result: SEED });
    res.end();
    return;
  }

  try {
    emit({ t: "status", text: `문서 로드 · ${names}` });
    emit({ t: "status", text: `AI 검토 엔진 기동 · ${MODEL} (effort: ${EFFORT})` });
    emit({ t: "status", text: "프로토콜·SOP 정밀 검토 — 표본·선정/제외·탈락·작성창·교차대조…" });
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: contentFor(docs) }],
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: EFFORT },
    });
    let buf = "";
    const feed = makeParser(emit);
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
        buf += ev.delta.text;
        feed(buf);
      }
    }
    const final = await stream.finalMessage();
    const text = final.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const parsed = JSON.parse(text);
    parsed.findings = (parsed.findings || []).map((f, i) => ({ id: f.id || `f${i + 1}`, ...f }));
    emit({ t: "done", result: { ...parsed, source: "ai", model: MODEL } });
    res.end();
  } catch (e) {
    emit({ t: "status", text: "분석 서비스 일시 오류 — 표준 점검 항목으로 진행" });
    emit({ t: "error", message: String(e) });
    emit({ t: "done", result: { ...SEED, source: "seed", error: String(e) } });
    res.end();
  }
}

export async function analyzeDocuments(body) {
  const docs = (body?.docs || []).filter((d) => d && (d.text || d.data));
  if (!process.env.ANTHROPIC_API_KEY || docs.length === 0) return SEED;
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: contentFor(docs) }],
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: EFFORT },
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const parsed = JSON.parse(text);
    parsed.findings = (parsed.findings || []).map((f, i) => ({ id: f.id || `f${i + 1}`, ...f }));
    return { ...parsed, source: "ai", model: MODEL };
  } catch (e) {
    return { ...SEED, source: "seed", error: String(e) };
  }
}

export const handle = (body) => analyzeDocuments(body);
