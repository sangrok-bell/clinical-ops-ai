// Per-patient detection engine (deterministic, pure). Implements the SOP's
// data-integrity layers for a single night of incoming data, checked against
// (a) the population/protocol rules (Edit Checks EC-01·03·06·12·14) and
// (b) the PATIENT'S OWN baseline distribution (SOP §6.2 / EC-14 within-patient
// IQR·z-score) — the "정상 범위지만 이 환자에겐 이상" signal a standard ePRO/EDC
// range check cannot see. Numbers here are computed by rules/stats ONLY.

import type { Patient, RespNight, DiaryNight } from "@/somnus/data/studyDb";

export type Severity = "Critical" | "Major" | "Minor";
export type FindingKind = "population" | "within_patient" | "cross_source";

export type Baseline = { mean: number; sd: number; n: number; z: number; q1: number; q3: number; series: number[] };
export type PtFinding = {
  key: string; metric: string; value: number;
  kind: FindingKind; ec: string; severity: Severity;
  msg: string;
  population_ok?: boolean;     // true = within population range but flagged for THIS patient
  baseline?: Baseline;
};

export type NightInput = {
  date: string;
  // smartwatch / 호흡디텍팅 (objective)
  dur_min: number; ahi: number; resp_rate: number; spo2_min: number; spo2_mean: number; snore_min: number;
  // 수면일기 (subjective)
  bedtime: string; waketime: string; sol_min: number; waso_min: number; awakenings: number; tst_min: number; quality: number;
};

const POP_RANGE: Record<string, [number, number]> = {
  spo2_mean: [70, 100], spo2_min: [70, 100], resp_rate: [8, 25],
  ahi: [0, 100], dur_min: [0, 960], sol_min: [0, 600], waso_min: [0, 600], tst_min: [0, 960], quality: [1, 5],
};
const LABEL: Record<string, string> = {
  spo2_mean: "평균 SpO₂", spo2_min: "최저 SpO₂", resp_rate: "평균 호흡수", ahi: "AHI", snore_min: "코골이 시간",
  dur_min: "측정 시간", sol_min: "입면 지연(SOL)", waso_min: "야간 각성(WASO)", tst_min: "총수면시간(TST)", quality: "주관적 수면질",
};
const UNIT: Record<string, string> = { spo2_mean: "%", spo2_min: "%", resp_rate: "회/분", ahi: "", snore_min: "분", dur_min: "분", sol_min: "분", waso_min: "분", tst_min: "분", quality: "/5" };
// which metrics get within-patient baseline analysis, and from which history source
const WITHIN: { key: keyof NightInput; src: "resp" | "diary" }[] = [
  { key: "spo2_mean", src: "resp" }, { key: "spo2_min", src: "resp" }, { key: "ahi", src: "resp" },
  { key: "resp_rate", src: "resp" }, { key: "snore_min", src: "resp" },
  { key: "tst_min", src: "diary" }, { key: "sol_min", src: "diary" }, { key: "waso_min", src: "diary" }, { key: "quality", src: "diary" },
];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[], m: number) => Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1 || 1));
const quantile = (sorted: number[], q: number) => {
  const pos = (sorted.length - 1) * q, base = Math.floor(pos), rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
};
const minutesBetween = (bed: string, wake: string) => {
  const p = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  return ((p(wake) - p(bed)) % 1440 + 1440) % 1440;
};
export const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1));

function baseline(series: number[], value: number): Baseline {
  const m = mean(series), s = sd(series, m);
  const sorted = [...series].sort((a, b) => a - b);
  return { mean: m, sd: s, n: series.length, z: s > 0 ? (value - m) / s : 0, q1: quantile(sorted, 0.25), q3: quantile(sorted, 0.75), series };
}

/** typical night for the patient — prefills a realistic "today" form from history medians. */
export function typicalNight(resp: RespNight[], diary: DiaryNight[]): Partial<NightInput> {
  const med = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null).sort((a, b) => a - b); return v.length ? Math.round(v[Math.floor(v.length / 2)]) : 0; };
  const r = resp.slice(-30), d = diary.slice(-30);
  return {
    dur_min: med(r.map((x) => x.dur_min)), ahi: med(r.map((x) => x.ahi)), resp_rate: med(r.map((x) => x.resp_rate)),
    spo2_min: med(r.map((x) => x.spo2_min)), spo2_mean: med(r.map((x) => x.spo2_mean)), snore_min: med(r.map((x) => x.snore_min)),
    bedtime: "23:30", waketime: "07:00", sol_min: med(d.map((x) => x.sol_min)), waso_min: med(d.map((x) => x.waso_min)),
    awakenings: med(d.map((x) => x.awakenings)), tst_min: med(d.map((x) => x.tst_min)), quality: med(d.map((x) => x.quality)),
  };
}

const Z_THRESHOLD = 3; // SOP §6.2 |z|>3

/** The detection: one incoming night, checked vs population rules + this patient's own baseline. */
export function checkNight(patient: Patient, n: NightInput, hist: { resp: RespNight[]; diary: DiaryNight[] }): PtFinding[] {
  const out: PtFinding[] = [];
  const val = (k: string) => (n as unknown as Record<string, number>)[k];

  // ── population: range (EC-01) ──
  for (const [k, [lo, hi]] of Object.entries(POP_RANGE)) {
    const v = val(k);
    if (v == null || Number.isNaN(v)) continue;
    if (v < lo || v > hi) out.push({ key: k, metric: LABEL[k] ?? k, value: v, kind: "population", ec: "EC-01", severity: "Critical", msg: `${LABEL[k] ?? k} ${fmt(v)}${UNIT[k] ?? ""} — 허용 범위[${lo}–${hi}] 밖` });
  }
  // ── population: sensor validity (EC-06) ──
  if (n.spo2_mean === 0 || n.resp_rate === 0) out.push({ key: "sensor", metric: "센서 신호", value: 0, kind: "population", ec: "EC-06", severity: "Major", msg: "SpO₂/호흡수 0 — 센서 결측·신호 유실 의심" });
  // ── population: cross-field (EC-12) 최저SpO2 ≤ 평균SpO2 ──
  if (n.spo2_min != null && n.spo2_mean != null && n.spo2_min > n.spo2_mean) out.push({ key: "spo2_min", metric: "SpO₂ 일관성", value: n.spo2_min, kind: "population", ec: "EC-12", severity: "Major", msg: `최저 SpO₂(${fmt(n.spo2_min)}) > 평균 SpO₂(${fmt(n.spo2_mean)}) — 교차필드 모순` });
  // ── diary logic (EC-03): TST ≤ 침대 체류시간 ──
  const inBed = minutesBetween(n.bedtime, n.waketime);
  if (n.tst_min != null && inBed > 0 && n.tst_min > inBed) out.push({ key: "tst_min", metric: "수면일기 논리", value: n.tst_min, kind: "population", ec: "EC-03", severity: "Critical", msg: `총수면시간(${n.tst_min}분)이 침대 체류시간(${inBed}분, ${n.bedtime}→${n.waketime})보다 큼` });
  // ── clinical (EC-14): AHI ≥ 15 (OSA 신호) ──
  if (n.ahi != null && n.ahi >= 15) out.push({ key: "ahi", metric: "AHI", value: n.ahi, kind: "population", ec: "EC-14", severity: "Major", msg: `AHI ${fmt(n.ahi)} ≥ 15 — 수면무호흡(OSA) 신호, 의학적 검토 권고` });

  const flaggedKeys = new Set(out.map((f) => f.key));

  // ── within-patient (SOP §6.2 / EC-14): value is population-OK but an outlier vs THIS patient's own history ──
  for (const { key, src } of WITHIN) {
    if (flaggedKeys.has(key)) continue; // already a population finding
    const v = val(key);
    if (v == null || Number.isNaN(v)) continue;
    const series = (src === "resp" ? hist.resp.map((r) => (r as unknown as Record<string, number | null>)[key]) : hist.diary.map((d) => (d as unknown as Record<string, number | null>)[key])).filter((x): x is number => x != null);
    if (series.length < 10) continue;
    const b = baseline(series, v);
    const iqr = b.q3 - b.q1;
    const outlier = (b.sd > 0 && Math.abs(b.z) >= Z_THRESHOLD) || (iqr > 0 && (v < b.q1 - 1.5 * iqr || v > b.q3 + 1.5 * iqr));
    if (!outlier) continue;
    const dir = v < b.mean ? "낮음" : "높음";
    out.push({
      key, metric: LABEL[key] ?? key, value: v, kind: "within_patient", ec: "EC-14", severity: "Major", population_ok: true,
      msg: `${LABEL[key] ?? key} ${fmt(v)}${UNIT[key] ?? ""} — 모집단 정상이나 이 환자 평소(${fmt(b.mean)}±${fmt(b.sd)}) 대비 z=${b.z.toFixed(1)}, 비정상적으로 ${dir}`,
      baseline: b,
    });
  }
  return out;
}

export const SEVERITY_RANK: Record<Severity, number> = { Critical: 0, Major: 1, Minor: 2 };
