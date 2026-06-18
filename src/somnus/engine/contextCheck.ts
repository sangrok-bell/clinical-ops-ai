// Context-conditional personalized anomaly detection (the "다중조건 맥락 이상" gap).
// These records PASS global range checks AND simple population stats, but are anomalous
// GIVEN the patient's own context (음주·카페인·운동·스트레스) or trend. The deterministic
// layer here is a HIGH-RECALL candidate filter (intentionally loose); the LLM agent
// (/api/context-anomaly) then judges/prunes each candidate with contextual reasoning.
// Validated against the ground-truth key (studyDb.anomalyKey()).
import type { StudyDb, DiaryNight, IsiEpro, WatchDaily } from "@/somnus/data/studyDb";

export type ContextAnomaly = {
  patient_id: string;
  source: "diary" | "isi_epro" | "watch_daily";
  fam: "sol" | "isi" | "hr";
  signal: string; // human label
  date: string;
  value: number;
  unit: string;
  context: string; // human context summary
  baseline: string; // e.g. "유사 맥락 ~21분"
  expected: number; // context-conditional expectation
  z: number;
  direction: "high" | "low";
  msg: string;
};

const stats = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
  return { m, sd, n: xs.length };
};

const dgood = (r: DiaryNight) => r.alcohol === "N" && r.caffeine === "N" && r.stress !== "상";
const dbad = (r: DiaryNight) => r.alcohol === "Y" || r.caffeine === "Y" || r.stress === "상";
const diaryContext = (r: DiaryNight) =>
  [r.alcohol === "Y" ? "음주" : "금주", r.caffeine === "Y" ? "카페인" : "무카페인", r.exercise === "Y" ? "운동" : "미운동", `스트레스${r.stress ?? "?"}`].join("·");

// L-personal / SOL — context-conditional: good-context night with high SOL, or bad-context night with low SOL.
function diarySol(pid: string, nights: DiaryNight[]): ContextAnomaly[] {
  const out: ContextAnomaly[] = [];
  const ns = nights.filter((r) => r.sol_min != null);
  const good = ns.filter(dgood).map((r) => r.sol_min as number);
  const bad = ns.filter(dbad).map((r) => r.sol_min as number);
  const gs = good.length >= 5 ? stats(good) : null;
  const bs = bad.length >= 5 ? stats(bad) : null;
  for (const r of ns) {
    const v = r.sol_min as number;
    if (gs && gs.sd > 2 && dgood(r)) {
      const z = (v - gs.m) / gs.sd;
      if (z >= 2)
        out.push({
          patient_id: pid, source: "diary", fam: "sol", signal: "입면 지연(SOL)", date: r.date, value: v, unit: "분",
          context: diaryContext(r), baseline: `유사 맥락 평균 ${gs.m.toFixed(0)}분`, expected: Math.round(gs.m), z: +z.toFixed(1), direction: "high",
          msg: `좋은 맥락(${diaryContext(r)})인데 입면 지연 ${v}분 — 본인 유사맥락 평균(${gs.m.toFixed(0)}분) 대비 비정상적으로 높음`,
        });
    }
    if (bs && bs.sd > 2 && dbad(r)) {
      const z = (v - bs.m) / bs.sd;
      if (z <= -1.8)
        out.push({
          patient_id: pid, source: "diary", fam: "sol", signal: "입면 지연(SOL)", date: r.date, value: v, unit: "분",
          context: diaryContext(r), baseline: `유사 맥락 평균 ${bs.m.toFixed(0)}분`, expected: Math.round(bs.m), z: +z.toFixed(1), direction: "low",
          msg: `나쁜 맥락(${diaryContext(r)})이라 길어야 정상인데 입면 지연 ${v}분 — 본인 유사맥락 평균(${bs.m.toFixed(0)}분) 대비 비정상적으로 낮음`,
        });
    }
  }
  return out;
}

// ISI ePRO — trend break: today's ISI vs the patient's own recent 21-day baseline.
function isiTrend(pid: string, xs: IsiEpro[]): ContextAnomaly[] {
  const out: ContextAnomaly[] = [];
  for (let i = 21; i < xs.length; i++) {
    const win = xs.slice(i - 21, i).map((r) => r.isi_total as number).filter((v) => v != null);
    if (win.length < 14) continue;
    const { m, sd } = stats(win);
    const s = Math.max(sd, 1.5);
    const v = xs[i].isi_total as number;
    if (v == null) continue;
    const z = (v - m) / s;
    if (Math.abs(z) >= 3.5)
      out.push({
        patient_id: pid, source: "isi_epro", fam: "isi", signal: "ISI 추세", date: xs[i].date, value: v, unit: "",
        context: `최근 21일 추세 ${m.toFixed(0)}점`, baseline: `개인 추세 ${m.toFixed(0)}점`, expected: Math.round(m), z: +z.toFixed(1), direction: z > 0 ? "high" : "low",
        msg: `개인 수면 추세(최근 ${m.toFixed(0)}점)와 불일치하는 ISI ${z > 0 ? "급등" : "급락"} ${v} — 전역 통과, 개인 추세 대비 이상`,
      });
  }
  return out;
}

// Watch resting HR — personal baseline deviation (context: 저활동·정상수면 still elevated).
function hrBaseline(pid: string, xs: WatchDaily[]): ContextAnomaly[] {
  const out: ContextAnomaly[] = [];
  const rows = xs.filter((r) => r.resting_hr != null);
  if (rows.length < 10) return out;
  const { m, sd } = stats(rows.map((r) => r.resting_hr as number));
  if (sd < 2) return out;
  for (const r of rows) {
    const v = r.resting_hr as number;
    const z = (v - m) / sd;
    if (Math.abs(z) >= 3.3)
      out.push({
        patient_id: pid, source: "watch_daily", fam: "hr", signal: "안정시 심박", date: r.date, value: v, unit: "bpm",
        context: "개인 평소 대비", baseline: `개인 평소 ${m.toFixed(0)}bpm`, expected: Math.round(m), z: +z.toFixed(1), direction: z > 0 ? "high" : "low",
        msg: `맥락(저활동·정상수면) 대비 안정시 심박 ${v}bpm — 개인 평소(${m.toFixed(0)}bpm) 대비 비정상적 ${z > 0 ? "상승" : "하락"}`,
      });
  }
  return out;
}

/** High-recall candidate scan across the cohort (deterministic; LLM agent prunes downstream). */
export function scanContextAnomalies(db: StudyDb): ContextAnomaly[] {
  const out: ContextAnomaly[] = [];
  for (const p of db.patients()) {
    const id = p.patient_id;
    out.push(...diarySol(id, db.diary(id)));
    out.push(...isiTrend(id, db.isiEpro(id)));
    out.push(...hrBaseline(id, db.watchDaily(id)));
  }
  return out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}

/** Recall against the ground-truth personalized-anomaly key (studyDb.anomalyKey()). */
export function contextRecall(db: StudyDb, found: ContextAnomaly[]) {
  const fam = (s: string) => (s.includes("입면") ? "sol" : s.includes("ISI") ? "isi" : s.includes("심박") ? "hr" : "?");
  const key = db.anomalyKey();
  const detail = key.map((a) => {
    const hit = found.some((f) => f.patient_id === a.patient_id && f.fam === fam(a.signal));
    return { id: a.anomaly_id, patient_id: a.patient_id, signal: a.signal, entered: a.entered, description: a.description, caught: hit };
  });
  return { recall: detail.filter((d) => d.caught).length, total: key.length, detail };
}
