// ① Protocol/SOP review client + types.
// All Claude calls happen server-side (/api/analyze-protocol, /api/reevaluate);
// the API key never reaches the browser. This module owns the client-side wire
// contract: it POSTs documents, consumes the NDJSON stream, and falls back to a
// local SEED (distinct from the server's 4-finding SEED) when the network fails.
// See spec/04 §3 (types) and spec/06 §5 (stream consume + retry + client SEED).

export type Severity = "critical" | "warning" | "info";

export type ProtocolFinding = {
  id: string;
  severity: Severity;
  category?: string;
  title: string;
  detail: string;
  suggested_fix: string;
  source?: string;
};

// AI's document-kind verdict — a SIGNAL, not a gate (the human overrides it).
export type DocAssessment = {
  is_target: boolean;
  confidence: "high" | "low";
  doc_kind: string;
  reason: string;
  therapeutic_area?: string;
  expected_measures?: string[];
};

export type AnalyzeResult = {
  findings: ProtocolFinding[];
  summary: string;
  doc_assessment?: DocAssessment; // snake_case (vs StudyHandoff.docAssessment)
  source?: "ai" | "seed";
  model?: string;
};

export type DocInput = {
  role: "protocol" | "sop";
  name: string;
  kind: "pdf" | "text";
  text?: string;
  data?: string; // base64 (pdf)
  mediaType?: string;
};

export type Reverdict = {
  verdict: "withdrawn" | "upheld";
  explanation: string;
  source?: string;
};

// NDJSON streaming event — discriminated union, discriminant `t` (5 variants).
export type AnalyzeEvent =
  | { t: "status"; text: string }
  | { t: "summary"; text: string }
  | { t: "finding"; finding: ProtocolFinding }
  | { t: "error"; message?: string }
  | { t: "done"; result: AnalyzeResult };

// Client SEED — distinct from the server's 4-finding seed: 2 findings (or1, or4),
// slightly different copy. Used on fetch failure / !r.ok / !r.body. See spec/06 §5.
const SEED: AnalyzeResult = {
  source: "seed",
  summary: "분석 서비스에 일시적으로 연결하지 못했습니다 — 표준 점검 항목을 표시합니다.",
  findings: [
    {
      id: "or1",
      severity: "critical",
      category: "표본",
      title: "표본 크기 부족",
      detail: "현재 24명 — 검정력 80%에 미달.",
      suggested_fix: "군당 ≥34명(총 68명)으로 상향.",
      source: "프로토콜 §3",
    },
    {
      id: "or4",
      severity: "critical",
      category: "SOP–프로토콜 불일치",
      title: "ePRO 작성창 불일치",
      detail: '프로토콜 "기상 후 1시간" vs SOP "오전 중".',
      suggested_fix: "두 문서의 작성창 정의를 일치시킬 것.",
      source: "프로토콜 §6.2 / SOP §3",
    },
  ],
};

// Non-streaming helper: one-shot POST, falls back to client SEED on failure.
export async function analyzeProtocol(docs: DocInput[]): Promise<AnalyzeResult> {
  try {
    const r = await fetch("/api/analyze-protocol", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ docs }),
    });
    if (!r.ok) return SEED;
    const data = (await r.json()) as AnalyzeResult;
    return data && data.findings ? data : SEED;
  } catch {
    return SEED;
  }
}

// Streaming consume: read the NDJSON body, split on "\n", JSON.parse each line,
// fire onEvent. Up to 2 attempts (1 retry) for cold-start / Vercel buffering.
// Both failing → emit a SEED `done` and return the client SEED. See spec/06 §5.
export async function analyzeProtocolStream(
  docs: DocInput[],
  onEvent: (e: AnalyzeEvent) => void,
): Promise<AnalyzeResult> {
  const attempt = async (): Promise<AnalyzeResult> => {
    const r = await fetch("/api/analyze-protocol", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ docs }),
    });
    if (!r.ok || !r.body) throw new Error("no stream");

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let final: AnalyzeResult | null = null;

    const handleLine = (line: string) => {
      const s = line.trim();
      if (!s) return;
      let ev: AnalyzeEvent;
      try {
        ev = JSON.parse(s) as AnalyzeEvent;
      } catch {
        return; // partial / malformed JSON — skip
      }
      onEvent(ev);
      if (ev.t === "done") final = ev.result;
    };

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        handleLine(line);
      }
    }
    // Last chunk may carry `done` without a trailing newline.
    handleLine(buf);

    if (!final) throw new Error("no done event");
    return final;
  };

  try {
    return await attempt();
  } catch {
    onEvent({ t: "status", text: "분석 서버 재연결 중…" });
    try {
      return await attempt();
    } catch {
      onEvent({ t: "done", result: SEED });
      return SEED;
    }
  }
}

// Rebuttal re-evaluation: POST finding + rebuttal, advisory verdict (human decides).
export async function reevaluateFinding(
  finding: ProtocolFinding,
  rebuttal: string,
): Promise<Reverdict> {
  try {
    const r = await fetch("/api/reevaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ finding, rebuttal }),
    });
    if (!r.ok) throw new Error("reevaluate failed");
    return (await r.json()) as Reverdict;
  } catch {
    return {
      verdict: "upheld",
      explanation: "재검토 호출 실패 — 사람 판단으로 처리하세요.",
      source: "seed",
    };
  }
}
