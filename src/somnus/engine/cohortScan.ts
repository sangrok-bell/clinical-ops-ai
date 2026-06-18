// Cohort-wide batch scan (deterministic, pure). Runs the SOP Edit Checks across
// the WHOLE study — every patient master row, every respiratory/diary night —
// plus per-patient (within-subject) outliers. Surfaces the data-integrity issues
// seeded into the dataset. (Precision/recall vs the 99_오류정답지 answer key is
// layered on top once that sheet is provided.)
import type { StudyDb, Patient, RespNight, DiaryNight } from "@/somnus/data/studyDb";

export type Severity = "Critical" | "Major" | "Minor";
export type CohortFinding = {
  patient_id: string; date: string; domain: "환자정보" | "호흡디텍팅" | "수면일기";
  ec: string; severity: Severity; metric: string; value: number | string; msg: string;
  kind?: "population" | "within_patient";
};
export type CohortReport = {
  patients: number; respRows: number; diaryRows: number; scannedRows: number;
  total: number; within_patient: number; flagged_patients: number;
  by_severity: Record<Severity, number>;
  by_ec: { ec: string; n: number }[];
  top_patients: { patient_id: string; n: number }[];
  sample: CohortFinding[]; // capped for display
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[], m: number) => Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1 || 1));
const inBed = (bed: string, wake: string) => { const p = (s: string) => { const [h, m] = (s || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); }; return ((p(wake) - p(bed)) % 1440 + 1440) % 1440; };

const RANGE: Record<string, [number, number]> = { spo2_min: [70, 100], spo2_mean: [70, 100], resp_rate: [8, 25], ahi: [0, 100], dur_min: [0, 960], sol_min: [0, 600], waso_min: [0, 600], tst_min: [0, 960], quality: [1, 5] };
const LBL: Record<string, string> = { spo2_min: "최저 SpO₂", spo2_mean: "평균 SpO₂", resp_rate: "평균 호흡수", ahi: "AHI", dur_min: "측정시간", sol_min: "입면(SOL)", waso_min: "각성(WASO)", tst_min: "총수면(TST)", quality: "수면질" };
const WITHIN: { key: string; src: "resp" | "diary" }[] = [
  { key: "spo2_mean", src: "resp" }, { key: "spo2_min", src: "resp" }, { key: "ahi", src: "resp" }, { key: "resp_rate", src: "resp" },
  { key: "tst_min", src: "diary" }, { key: "sol_min", src: "diary" }, { key: "waso_min", src: "diary" }, { key: "quality", src: "diary" },
];

export function scanCohort(db: StudyDb): CohortReport {
  const findings: CohortFinding[] = [];
  const add = (f: CohortFinding) => findings.push(f);
  const num = (v: unknown): number | null => (typeof v === "number" && !Number.isNaN(v) ? v : null);

  let respRows = 0, diaryRows = 0;
  for (const p of db.patients()) {
    const id = p.patient_id;
    // ── patient master (EC-12 cross-field · EC-13 eligibility · EC-01 range) ──
    if (num(p.age) != null && (p.age! < 19 || p.age! > 65)) add({ patient_id: id, date: p.enroll_date, domain: "환자정보", ec: "EC-13", severity: "Critical", metric: "나이", value: p.age!, msg: `나이 ${p.age}세 — 선정기준(19–65세) 위반` });
    if (num(p.baseline_isi) != null && (p.baseline_isi! < 0 || p.baseline_isi! > 28)) add({ patient_id: id, date: p.enroll_date, domain: "환자정보", ec: "EC-01", severity: "Critical", metric: "baseline ISI", value: p.baseline_isi!, msg: `기저 ISI ${p.baseline_isi} — 허용 범위[0–28] 밖` });
    if (num(p.weight_kg) != null && (p.weight_kg! < 30 || p.weight_kg! > 250)) add({ patient_id: id, date: p.enroll_date, domain: "환자정보", ec: "EC-01", severity: "Critical", metric: "몸무게", value: p.weight_kg!, msg: `몸무게 ${p.weight_kg}kg — 생리적으로 불가(자릿수·단위 오기입 의심)` });
    if (num(p.bmi) != null && num(p.height_cm) != null && num(p.weight_kg) != null) {
      const calc = p.weight_kg! / (p.height_cm! / 100) ** 2;
      if (Math.abs(calc - p.bmi!) > 1.5) add({ patient_id: id, date: p.enroll_date, domain: "환자정보", ec: "EC-12", severity: "Major", metric: "BMI", value: p.bmi!, msg: `BMI ${p.bmi} ≠ 계산값 ${calc.toFixed(1)}(키·몸무게 기준) — 교차필드 불일치` });
    }
    if (p.sex && !["M", "F"].includes(p.sex)) add({ patient_id: id, date: p.enroll_date, domain: "환자정보", ec: "EC-12", severity: "Major", metric: "성별", value: p.sex, msg: `성별 '${p.sex}' — 허용 코드(M/F) 밖` });

    const resp = db.resp(id), diary = db.diary(id);
    respRows += resp.length; diaryRows += diary.length;

    // ── per-row population checks ──
    for (const r of resp) {
      for (const k of ["spo2_min", "spo2_mean", "resp_rate", "ahi", "dur_min"]) {
        const v = num((r as unknown as Record<string, unknown>)[k]); if (v == null) continue;
        const [lo, hi] = RANGE[k]; if (v < lo || v > hi) add({ patient_id: id, date: r.date, domain: "호흡디텍팅", ec: "EC-01", severity: "Critical", metric: LBL[k], value: v, msg: `${LBL[k]} ${v} — 허용 범위[${lo}–${hi}] 밖` });
      }
      if (r.spo2_mean === 0 || r.resp_rate === 0) add({ patient_id: id, date: r.date, domain: "호흡디텍팅", ec: "EC-06", severity: "Major", metric: "센서", value: 0, msg: "SpO₂/호흡수 0 — 센서 신호 유실" });
      if (num(r.spo2_min) != null && num(r.spo2_mean) != null && r.spo2_min! > r.spo2_mean!) add({ patient_id: id, date: r.date, domain: "호흡디텍팅", ec: "EC-12", severity: "Major", metric: "SpO₂", value: r.spo2_min!, msg: `최저 SpO₂(${r.spo2_min}) > 평균(${r.spo2_mean}) — 교차필드 모순` });
      if (num(r.ahi) != null && r.ahi! >= 15) add({ patient_id: id, date: r.date, domain: "호흡디텍팅", ec: "EC-14", severity: "Major", metric: "AHI", value: r.ahi!, msg: `AHI ${r.ahi} ≥ 15 — OSA 신호` });
    }
    for (const d of diary) {
      for (const k of ["sol_min", "waso_min", "tst_min", "quality"]) {
        const v = num((d as unknown as Record<string, unknown>)[k]); if (v == null) continue;
        const [lo, hi] = RANGE[k]; if (v < lo || v > hi) add({ patient_id: id, date: d.date, domain: "수면일기", ec: "EC-01", severity: "Critical", metric: LBL[k], value: v, msg: `${LBL[k]} ${v} — 허용 범위[${lo}–${hi}] 밖` });
      }
      const bed = inBed(d.bedtime, d.waketime);
      if (num(d.tst_min) != null && bed > 0 && d.tst_min! > bed) add({ patient_id: id, date: d.date, domain: "수면일기", ec: "EC-03", severity: "Critical", metric: "TST 논리", value: d.tst_min!, msg: `총수면(${d.tst_min}분) > 침대 체류(${bed}분) — 일기 논리 위반` });
    }

    // ── within-patient outliers (SOP §6.2) ──
    for (const { key, src } of WITHIN) {
      const rows = src === "resp" ? resp : diary;
      const series = rows.map((x) => num((x as unknown as Record<string, unknown>)[key])).filter((v): v is number => v != null);
      if (series.length < 12) continue;
      const m = mean(series), s = sd(series, m); if (s <= 0) continue;
      rows.forEach((x) => {
        const v = num((x as unknown as Record<string, unknown>)[key]); if (v == null) return;
        const [lo, hi] = RANGE[key]; if (v < lo || v > hi) return; // already population-flagged
        const z = (v - m) / s;
        if (Math.abs(z) >= 3.5) add({ patient_id: id, date: (x as { date: string }).date, domain: src === "resp" ? "호흡디텍팅" : "수면일기", ec: "EC-14", severity: "Major", metric: LBL[key], value: v, msg: `${LBL[key]} ${v} — 본인 평소 ${m.toFixed(1)}±${s.toFixed(1)} 대비 z=${z.toFixed(1)} (환자 기준 이상)`, kind: "within_patient" } as CohortFinding);
      });
    }
  }

  for (const f of findings) if (!f.kind) f.kind = "population";
  const bySev: Record<Severity, number> = { Critical: 0, Major: 0, Minor: 0 };
  const byEc = new Map<string, number>();
  const byPt = new Map<string, number>();
  for (const f of findings) { bySev[f.severity]++; byEc.set(f.ec, (byEc.get(f.ec) ?? 0) + 1); byPt.set(f.patient_id, (byPt.get(f.patient_id) ?? 0) + 1); }
  const rank: Record<Severity, number> = { Critical: 0, Major: 1, Minor: 2 };

  return {
    patients: db.patients().length, respRows, diaryRows, scannedRows: respRows + diaryRows + db.patients().length,
    total: findings.length, within_patient: findings.filter((f) => f.kind === "within_patient").length, flagged_patients: byPt.size,
    by_severity: bySev,
    by_ec: [...byEc.entries()].map(([ec, n]) => ({ ec, n })).sort((a, b) => b.n - a.n),
    top_patients: [...byPt.entries()].map(([patient_id, n]) => ({ patient_id, n })).sort((a, b) => b.n - a.n).slice(0, 8),
    sample: [...findings].sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 60),
  };
}
