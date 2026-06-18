// Deterministic validation engine for the insomnia DTx study.
// DOMAIN = insomnia DTx. ePRO = validated scales (ISI·ESS·PHQ-9·GAD-7) + sleep diary;
// objective source = smartwatch (actigraphy). Channels are study-AGNOSTIC — per-study
// differences (column ranges, role bindings, thresholds) live in Config. Numbers are
// computed here by rules/stats ONLY; the LLM (server /api/explain) merely judges/explains.

export type Tier = "absurd" | "plausible";
export type Cls = "data_quality" | "safety" | "clinical_signal";
export type Verdict = "오입력" | "논리모순" | "정상" | "사람검토";
export type Route = "확정쿼리" | "검토필요_SDV" | "안전_에스컬레이션" | "통과";
export type ValLayer = "L1" | "L2" | "L3" | "L5" | "L6" | "safety";

export type ValFinding = {
  subject: string;
  channel: string;
  layer: ValLayer;
  tier: Tier;
  cls: Cls;
  verdict: Verdict;
  route: Route;
  severity: "block" | "critical" | "high" | "medium" | "low";
  msg: string;
  evidence?: string;
};

export type Subject = {
  subject_id: string;
  site_id?: string;
  arm?: string;
  enroll_date?: string;
  note?: string;
};

// One ePRO assessment (per visit/week): validated scale totals + the SI item + last-night diary sleep.
export type SleepRow = {
  subject_id: string;
  date: string;
  isi_total: number;
  isi_items?: number[];
  ess_total: number;
  phq9_total: number;
  phq9_item9: number;
  gad7_total: number;
  diary_tst: number;
  entry_timestamp: string;
};

export type WatchRow = {
  subject_id: string;
  date: string;
  watch_tst: number;
};

export type AeRow = {
  subject_id: string;
  ae_term: string;
  onset_date: string;
};

export type Dataset = {
  subjects: Subject[];
  assessments: SleepRow[];
  watch: WatchRow[];
  ae: AeRow[];
};

export type Config = {
  ranges: Record<string, [number, number]>;
  bindings: {
    subjectiveSeverity: string;
    objectiveSleep: string;
    safetyItem: string;
    safetyScale: string;
  };
  ISI_SEVERE: number;
  WATCH_GOOD_TST: number;
  PHQ9_HIGH: number;
  cross_window: number;
  safety_window: number;
  backfill_min: number;
  var_window: number;
  var_std: number;
};

export const SLEEP_CONFIG: Config = {
  ranges: {
    isi_total: [0, 28],
    ess_total: [0, 24],
    phq9_total: [0, 27],
    gad7_total: [0, 21],
    phq9_item9: [0, 3],
    diary_tst: [0, 960],
  },
  bindings: {
    subjectiveSeverity: "isi_total",
    objectiveSleep: "watch_tst",
    safetyItem: "phq9_item9",
    safetyScale: "phq9_total",
  },
  ISI_SEVERE: 15, // ISI ≥15 = 중등도 이상 불면
  WATCH_GOOD_TST: 420, // 기기 측정 ≥7h = 객관적으로 잘 잠
  PHQ9_HIGH: 15, // PHQ-9 ≥15 = 중등도-중증 우울
  cross_window: 7,
  safety_window: 7,
  backfill_min: 5,
  var_window: 4,
  var_std: 0.5,
};

const RANGE_LABEL: Record<string, string> = {
  isi_total: "ISI(불면)",
  ess_total: "ESS(주간졸림)",
  phq9_total: "PHQ-9(우울)",
  gad7_total: "GAD-7(불안)",
  phq9_item9: "PHQ-9 자살사고 문항",
  diary_tst: "수면시간(분)",
};

// Single source of truth for range strings — ② renders ranges via this, never re-typed.
export const fmtRange = ([lo, hi]: [number, number]): string => `${lo}–${hi}`;

// date string → epoch day (integer); only the leading YYYY-MM-DD is used.
const dnum = (s: string) => Math.round(Date.parse(s.slice(0, 10)) / 86400000);

// population standard deviation (denominator n, not n-1). empty → 0.
const pstdev = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

const CONFIRM_LOGIC = new Set(["scale_consistency"]);
const SOFT_SIGNAL = new Set(["triangulation", "timestamp_forensics", "variance_anomaly", "mahalanobis"]);

function routeFor(channel: string, cls: Cls): { verdict: Verdict; route: Route; tier: Tier } {
  if (cls === "safety") return { verdict: "논리모순", route: "안전_에스컬레이션", tier: "absurd" };
  if (SOFT_SIGNAL.has(channel)) return { verdict: "사람검토", route: "검토필요_SDV", tier: "plausible" };
  const verdict: Verdict = CONFIRM_LOGIC.has(channel) ? "논리모순" : "오입력";
  return { verdict, route: "확정쿼리", tier: "absurd" };
}

function mk(p: Omit<ValFinding, "verdict" | "route" | "tier">): ValFinding {
  return { ...p, ...routeFor(p.channel, p.cls) };
}

export const findingKey = (f: ValFinding): string => `${f.subject}:${f.channel}:${f.evidence ?? ""}`;

const order: Route[] = ["안전_에스컬레이션", "확정쿼리", "검토필요_SDV", "통과"];

// ── channels (6) ─────────────────────────────────────────────────────────────

// L1 — range check
export function chkRange(row: Record<string, unknown>, subject: string, ranges: Config["ranges"]): ValFinding[] {
  const out: ValFinding[] = [];
  for (const [col, [lo, hi]] of Object.entries(ranges)) {
    const v = row[col];
    if (v === undefined || v === null || v === "") continue;
    const n = typeof v === "number" ? v : Number(String(v).match(/^\s*(-?\d+(?:\.\d+)?)/)?.[1]);
    if (Number.isNaN(n)) continue;
    if (n < lo || n > hi) {
      out.push(
        mk({
          subject,
          channel: "range",
          layer: "L1",
          cls: "data_quality",
          severity: "block",
          msg: `${RANGE_LABEL[col] ?? col} ${n} — 허용 범위[${lo}, ${hi}] 밖`,
          evidence: `${col}=${n}`,
        }),
      );
    }
  }
  return out;
}

// L2 — scale internal consistency
export function chkScaleConsistency(row: { isi_total?: number; isi_items?: number[] }, subject: string): ValFinding[] {
  if (!row.isi_items || row.isi_items.length === 0) return [];
  const sum = row.isi_items.reduce((a, b) => a + Number(b), 0);
  if (Number(row.isi_total) !== sum) {
    return [
      mk({
        subject,
        channel: "scale_consistency",
        layer: "L2",
        cls: "data_quality",
        severity: "high",
        msg: `ISI 총점(${row.isi_total})이 7문항 합(${sum})과 불일치 — 척도 내적 모순`,
        evidence: `isi_total=${row.isi_total} vs Σitems=${sum}`,
      }),
    ];
  }
  return [];
}

// L3 — multi-source triangulation (subjective ISI ↔ objective watch sleep)
export function chkTriangulation(sid: string, assessments: SleepRow[], watch: WatchRow[], cfg: Config): ValFinding[] {
  const out: ValFinding[] = [];
  for (const a of assessments) {
    if (a.isi_total < cfg.ISI_SEVERE) continue;
    const w = watch.find((x) => Math.abs(dnum(x.date) - dnum(a.date)) <= cfg.cross_window && x.watch_tst >= cfg.WATCH_GOOD_TST);
    if (w) {
      out.push(
        mk({
          subject: sid,
          channel: "triangulation",
          layer: "L3",
          cls: "data_quality",
          severity: "high",
          msg: `주관적 중증 불면(ISI ${a.isi_total})인데 스마트워치 측정 수면 ${(w.watch_tst / 60).toFixed(1)}h — 주관↔객관 불일치(다중소스), 원자료 대조(SDV) 권고`,
          evidence: `${a.date} ISI=${a.isi_total} vs watch=${w.watch_tst}min`,
        }),
      );
    }
  }
  return out;
}

// safety — depression high-risk + missing AE
export function chkSafety(sid: string, assessments: SleepRow[], ae: AeRow[], cfg: Config): ValFinding[] {
  for (const a of assessments) {
    const signal = Number(a.phq9_item9) > 0 || Number(a.phq9_total) >= cfg.PHQ9_HIGH;
    if (!signal) continue;
    const covered = ae.some((x) => Math.abs(dnum(x.onset_date) - dnum(a.date)) <= cfg.safety_window);
    if (!covered) {
      return [
        mk({
          subject: sid,
          channel: "safety_cross_form",
          layer: "safety",
          cls: "safety",
          severity: "critical",
          msg: `${a.date} 우울 고위험(PHQ-9=${a.phq9_total}${Number(a.phq9_item9) > 0 ? `, 자살사고 문항=${a.phq9_item9}` : ""})인데 ±${cfg.safety_window}일 내 이상반응(AE) 미보고 — 안전성 누락 우려`,
          evidence: `${a.date} PHQ9=${a.phq9_total}, item9=${a.phq9_item9}, AE 없음`,
        }),
      ];
    }
  }
  return [];
}

// L6 — backfilling (bulk post-hoc entry)
export function chkTimestampForensics(sid: string, assessments: SleepRow[], cfg: Config): ValFinding[] {
  const out: ValFinding[] = [];
  const byEntry = new Map<string, Set<string>>();
  for (const a of assessments) {
    const k = a.entry_timestamp.slice(0, 10);
    (byEntry.get(k) ?? byEntry.set(k, new Set()).get(k)!).add(a.date);
  }
  for (const [day, dates] of byEntry) {
    if (dates.size >= cfg.backfill_min) {
      out.push(
        mk({
          subject: sid,
          channel: "timestamp_forensics",
          layer: "L6",
          cls: "data_quality",
          severity: "high",
          msg: `${day} 하루에 ${dates.size}회차 설문을 일괄 입력 — 백필링(사후 입력) 의심`,
          evidence: `entry ${day} ← ${dates.size} assessments`,
        }),
      );
    }
  }
  return out;
}

// L6 — flatlining (no variance)
export function chkVarianceAnomaly(sid: string, assessments: SleepRow[], cfg: Config): ValFinding[] {
  const rows = [...assessments].sort((a, b) => dnum(a.date) - dnum(b.date));
  const series = rows.map((r) => Number(r.isi_total));
  for (let i = 0; i + cfg.var_window <= series.length; i++) {
    const w = series.slice(i, i + cfg.var_window);
    if (pstdev(w) < cfg.var_std) {
      return [
        mk({
          subject: sid,
          channel: "variance_anomaly",
          layer: "L6",
          cls: "data_quality",
          severity: "medium",
          msg: `연속 ${w.length}회차 ISI 점수 변동 0(평탄) — 조작/일괄생성 의심(실제 불면은 변동)`,
          evidence: `${rows[i].date}~ ${cfg.var_window}회 ISI std≈0`,
        }),
      ];
    }
  }
  return [];
}

// ── entry points ─────────────────────────────────────────────────────────────

export type SingleResult = {
  ok: boolean;
  verdict: Verdict;
  route: Route;
  findings: ValFinding[];
};

// entry-time, self-contained: range + scale-consistency only.
export function analyzeSingle(record: Record<string, unknown>, schema?: { ranges?: Config["ranges"] }): SingleResult {
  const ranges = schema?.ranges ?? SLEEP_CONFIG.ranges;
  const sid = String(record.subject_id ?? "—");
  const findings = [...chkRange(record, sid, ranges), ...chkScaleConsistency(record as { isi_total?: number; isi_items?: number[] }, sid)];
  const top = [...findings].sort((a, b) => order.indexOf(a.route) - order.indexOf(b.route))[0];
  return { ok: findings.length === 0, verdict: top?.verdict ?? "정상", route: top?.route ?? "통과", findings };
}

export type BulkSummary = {
  records_in: number;
  flagged_subjects: number;
  확정쿼리: number;
  검토필요_SDV: number;
  안전_에스컬레이션: number;
  silent_pass: 0;
};

export type BulkResult = {
  summary: BulkSummary;
  records: ValFinding[];
};

// batch, with config injection (② tuning flows in here and changes flagging).
export function analyzeBulk(dataset: Dataset, config?: Partial<Config>): BulkResult {
  const cfg: Config = { ...SLEEP_CONFIG, ...config };
  const byA = new Map<string, SleepRow[]>();
  const byW = new Map<string, WatchRow[]>();
  const byAe = new Map<string, AeRow[]>();
  for (const a of dataset.assessments ?? []) (byA.get(a.subject_id) ?? byA.set(a.subject_id, []).get(a.subject_id)!).push(a);
  for (const w of dataset.watch ?? []) (byW.get(w.subject_id) ?? byW.set(w.subject_id, []).get(w.subject_id)!).push(w);
  for (const e of dataset.ae ?? []) (byAe.get(e.subject_id) ?? byAe.set(e.subject_id, []).get(e.subject_id)!).push(e);

  const records: ValFinding[] = [];
  for (const s of dataset.subjects ?? []) {
    const sid = s.subject_id;
    const A = byA.get(sid) ?? [];
    const W = byW.get(sid) ?? [];
    const E = byAe.get(sid) ?? [];
    records.push(...chkTriangulation(sid, A, W, cfg));
    records.push(...chkSafety(sid, A, E, cfg));
    records.push(...chkTimestampForensics(sid, A, cfg));
    records.push(...chkVarianceAnomaly(sid, A, cfg));
    for (const a of A) {
      records.push(...chkRange(a as Record<string, unknown>, sid, cfg.ranges));
      records.push(...chkScaleConsistency(a, sid));
    }
  }
  records.sort((a, b) => order.indexOf(a.route) - order.indexOf(b.route));

  const summary: BulkSummary = {
    records_in: dataset.assessments.length,
    flagged_subjects: new Set(records.map((r) => r.subject)).size,
    확정쿼리: records.filter((r) => r.route === "확정쿼리").length,
    검토필요_SDV: records.filter((r) => r.route === "검토필요_SDV").length,
    안전_에스컬레이션: records.filter((r) => r.route === "안전_에스컬레이션").length,
    silent_pass: 0,
  };
  return { summary, records };
}
