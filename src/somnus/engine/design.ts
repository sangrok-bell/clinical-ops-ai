// ② EDC·ePRO 설계 — 데이터 계약 + 클라이언트.
// Hybrid derivation: the ePRO scale block (+ L1/L2/L3/안전 rules) is DETERMINISTIC —
// it mirrors validate.ts (the engine ③ patient-app & ⑤ bulk-validation actually run),
// so the on-screen schema can never silently drift from what really executes. Visit CRF +
// SoA are AI-derived from the approved v1.0 docs (/api/derive-design); on failure → seed.
//
// origin "core" = deterministic/code (read-only); origin "ai" = derived from docs (editable/deletable).

import type { DocInput, DocAssessment } from "@/somnus/engine/protocol";
import { SLEEP_CONFIG, fmtRange } from "@/somnus/engine/validate";

// ── types ────────────────────────────────────────────────────────────────────

export type LayerTag = "L1" | "L2" | "L3" | "L5" | "L6" | "안전";
export type RuleSev = "crit" | "warn" | "info";
export type DesignRule = { layer: LayerTag; sev: RuleSev; desc: string };

export type DesignField = {
  id: string;
  form: string;
  variable: string;
  label: string;
  type: string;
  range: string; // human-readable range string (e.g. "0–28", "객관 소스", "Y/N")
  required: boolean;
  source: string;
  endpoint: string; // protocol endpoint this field implements (traceability)
  origin: "core" | "ai";
  rules: DesignRule[];
};

export type DesignVisit = { label: string; assessments: string[] };

export type DesignResult = {
  summary: string;
  fields: DesignField[];
  visits: DesignVisit[];
  source: "ai" | "seed";
  model?: string;
};

export type StudyHandoff = {
  docs: DocInput[];
  summary?: string;
  docAssessment?: DocAssessment;
};

// ── constants ──────────────────────────────────────────────────────────────────

export const EPRO_FORM = "불면 ePRO 설문 (ISI·ESS·PHQ-9·GAD-7) · 격주";
const VISIT_FORM = "방문 CRF (EDC)";
const R = SLEEP_CONFIG.ranges; // ranges come from the engine config — never re-typed, so the schema can't drift.

// ── CONNECTED_STUDY (provisioned study + conformance gate) ─────────────────────

export const CONNECTED_STUDY = {
  label: "불면 DTx (CBT-I)",
  domain: "불면증/수면",
  measures: ["ISI", "ESS", "PHQ-9", "GAD-7", "스마트워치 수면"],
  conforms: (a?: DocAssessment): boolean => {
    const area = a?.therapeutic_area;
    if (!area) return true; // no signal (seed/no-doc) → show the configured template
    if (/수면|불면|insomnia|sleep|cbt-?i/i.test(area)) return true;
    const ours = ["isi", "ess", "phq", "gad", "수면", "sleep"];
    return (a?.expected_measures ?? []).some((m) => ours.some((o) => m.toLowerCase().includes(o)));
  },
};

// ── CORE_FIELDS (deterministic ePRO block — 7 fields, mirrors validate.ts) ──────

const CORE_FIELDS: DesignField[] = [
  {
    id: "epro-isi",
    form: EPRO_FORM,
    variable: "ISI_TOTAL",
    label: "불면증 중증도(ISI) 총점",
    type: "정수",
    range: fmtRange(R.isi_total),
    required: true,
    source: "프로토콜 §ePRO / SOP §검증",
    endpoint: "1차: 불면 중증도",
    origin: "core",
    rules: [
      { layer: "L1", sev: "crit", desc: `${fmtRange(R.isi_total)} 범위 외` },
      { layer: "L2", sev: "crit", desc: "총점 ≠ 7문항 합 (척도 내적 모순)" },
      {
        layer: "L3",
        sev: "crit",
        desc: `ISI ≥${SLEEP_CONFIG.ISI_SEVERE}(중증)인데 스마트워치 측정 수면 정상 → 주관↔객관 불일치, 원자료 대조(SDV) 권고`,
      },
    ],
  },
  {
    id: "epro-ess",
    form: EPRO_FORM,
    variable: "ESS_TOTAL",
    label: "주간졸림(ESS)",
    type: "정수",
    range: fmtRange(R.ess_total),
    required: true,
    source: "프로토콜 §ePRO",
    endpoint: "주간 졸림",
    origin: "core",
    rules: [{ layer: "L1", sev: "warn", desc: `${fmtRange(R.ess_total)} 범위 외` }],
  },
  {
    id: "epro-phq9",
    form: EPRO_FORM,
    variable: "PHQ9_TOTAL",
    label: "우울(PHQ-9)",
    type: "정수",
    range: fmtRange(R.phq9_total),
    required: true,
    source: "프로토콜 §ePRO",
    endpoint: "우울 동반",
    origin: "core",
    rules: [
      { layer: "L1", sev: "warn", desc: `${fmtRange(R.phq9_total)} 범위 외` },
      { layer: "L6", sev: "info", desc: "기저 대비 급변" },
    ],
  },
  {
    id: "epro-si",
    form: EPRO_FORM,
    variable: "PHQ9_ITEM9",
    label: "자살사고 문항(PHQ-9 9번)",
    type: "정수",
    range: fmtRange(R.phq9_item9),
    required: true,
    source: "프로토콜 §안전성 / SOP §6",
    endpoint: "안전성 신호",
    origin: "core",
    rules: [
      {
        layer: "안전",
        sev: "crit",
        desc: `≥1 또는 PHQ-9 ≥${SLEEP_CONFIG.PHQ9_HIGH}인데 ±${SLEEP_CONFIG.safety_window}일 내 AE 없으면 안전성 누락`,
      },
    ],
  },
  {
    id: "epro-gad7",
    form: EPRO_FORM,
    variable: "GAD7_TOTAL",
    label: "불안(GAD-7)",
    type: "정수",
    range: fmtRange(R.gad7_total),
    required: true,
    source: "프로토콜 §ePRO",
    endpoint: "불안 동반",
    origin: "core",
    rules: [{ layer: "L1", sev: "warn", desc: `${fmtRange(R.gad7_total)} 범위 외` }],
  },
  {
    id: "epro-tst",
    form: EPRO_FORM,
    variable: "DIARY_TST",
    label: "어젯밤 수면시간(일지)",
    type: "정수(분)",
    range: fmtRange(R.diary_tst),
    required: false,
    source: "프로토콜 §ePRO",
    endpoint: "주관적 수면",
    origin: "core",
    rules: [{ layer: "L1", sev: "warn", desc: `${fmtRange(R.diary_tst)} 범위 외` }],
  },
  {
    id: "epro-watch",
    form: EPRO_FORM,
    variable: "WATCH_TST",
    label: "스마트워치 측정 수면(객관)",
    type: "정수(분)",
    range: "객관 소스",
    required: false,
    source: "기기 연동",
    endpoint: "객관적 수면(L3 소스)",
    origin: "core",
    rules: [{ layer: "L3", sev: "crit", desc: "ISI 자가보고와 교차검증" }],
  },
];

// ── visit-level CRF field shape returned by the server (id/form/origin injected by mergeVisit) ──

type VisitField = {
  variable: string;
  label: string;
  type: string;
  range: string;
  required: boolean;
  source: string;
  endpoint: string;
  rules: DesignRule[];
};

// ── SEED_VISIT (visit CRF · SoA fallback template) ─────────────────────────────

const SEED_VISIT: { summary: string; fields: Omit<DesignField, "form" | "origin">[]; visits: DesignVisit[] } = {
  summary: "방문 CRF·평가 일정 기준 템플릿입니다.",
  fields: [
    {
      id: "v-isiclin",
      variable: "ISI_CLIN",
      label: "임상 확인 ISI",
      type: "정수",
      range: "0–28",
      required: true,
      source: "프로토콜 §방문",
      endpoint: "임상 평가",
      rules: [{ layer: "L3", sev: "crit", desc: "자가보고 ISI와 임상 평가 불일치 점검" }],
    },
    {
      id: "v-resp",
      variable: "RESPONDER",
      label: "치료 반응(ISI ≥6점 감소; 관해 ISI<8)",
      type: "Y/N",
      range: "Y/N",
      required: true,
      source: "프로토콜 §7",
      endpoint: "1차: 반응률",
      rules: [{ layer: "L2", sev: "warn", desc: "ISI 변화량(≥6) 및 관해(ISI<8)와 반응 판정 일치" }],
    },
    {
      id: "v-phqc",
      variable: "PHQ9_CLIN",
      label: "임상 우울 평가",
      type: "정수",
      range: "0–27",
      required: true,
      source: "프로토콜 §안전성",
      endpoint: "안전성 모니터링",
      rules: [{ layer: "안전", sev: "crit", desc: "고위험 시 AE/이상반응 연계 확인" }],
    },
  ],
  visits: [
    { label: "Week 0 (기저)", assessments: ["ISI", "ESS", "PHQ-9", "GAD-7", "스마트워치 동기화"] },
    { label: "Week 4", assessments: ["ISI", "PHQ-9", "스마트워치"] },
    { label: "Week 8 (1차 평가)", assessments: ["ISI(1차)", "PHQ-9", "스마트워치"] },
    { label: "Week 12 (종료)", assessments: ["ISI", "PHQ-9", "반응 판정"] },
  ],
};

// ── mergeVisit (server visit-level fields → DesignField, prepend CORE_FIELDS) ──

function mergeVisit(part: { summary?: string; fields?: VisitField[]; visits?: DesignVisit[]; source?: string }): DesignResult {
  const visitFields: DesignField[] = (part.fields ?? []).map((f, i) => ({
    id: `v-${f.variable || i}`,
    form: VISIT_FORM,
    variable: f.variable,
    label: f.label,
    type: f.type,
    range: f.range,
    required: !!f.required,
    source: f.source,
    endpoint: f.endpoint,
    origin: "ai",
    rules: f.rules ?? [],
  }));
  return {
    summary: part.summary ?? "",
    fields: [...CORE_FIELDS, ...visitFields], // core always first
    visits: part.visits ?? [],
    source: part.source === "ai" ? "ai" : "seed",
  };
}

const SEED_RESULT: DesignResult = mergeVisit({
  ...SEED_VISIT,
  fields: SEED_VISIT.fields as VisitField[],
  source: "seed",
});

// ── client ──────────────────────────────────────────────────────────────────────

export async function deriveDesign(docs: DocInput[]): Promise<DesignResult> {
  try {
    const r = await fetch("/api/derive-design", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ docs }),
    });
    if (!r.ok) return SEED_RESULT;
    const data = await r.json();
    if (!data || !Array.isArray(data.fields)) return SEED_RESULT;
    return mergeVisit(data);
  } catch {
    return SEED_RESULT;
  }
}
