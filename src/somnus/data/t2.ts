import type { Dataset, Subject, SleepRow, WatchRow, AeRow } from "@/somnus/engine/validate";

// Seeded insomnia cohort (S-01..S-08). analyzeBulk(T2_DATASET) deterministically reproduces
// 6 headline catches + 2 passes (+ incidental flatline firings). Intended headlines:
//   L3 triangulation → S-02 (ISI severe but watch shows good sleep)
//   safety           → S-03 (PHQ-9 item9>0, no AE)   [S-04 covered by AE → no fire]
//   L6 backfilling    → S-05 (all entered one day)
//   L6 flatlining     → S-06 (identical ISI every visit)
//   L2 scale incons.  → S-07 (ISI total ≠ item sum)
//   boundary pass     → S-08 (ISI=15 but watch just under 'good')

const W0 = Date.parse("2026-03-02"); // 기준일 (등록일과 동일)
const dateAt = (k: number) => new Date(W0 + k * 14 * 86400000).toISOString().slice(0, 10); // biweekly
const TP = 7; // W0,2,4,6,8,10,12

const IDS = ["S-01", "S-02", "S-03", "S-04", "S-05", "S-06", "S-07", "S-08"];

const NOTES: Record<string, string> = {
  "S-01": "정상 경과(대조)",
  "S-02": "주관↔기기 불일치(ISI 18 / watch 7.7h)",
  "S-03": "우울 신호(PHQ-9 item9), AE 없음",
  "S-04": "동일 신호이나 AE 후속조치됨(오탐 금지)",
  "S-05": "백필링(일괄 입력)",
  "S-06": "ISI 평탄(매 회차 동일)",
  "S-07": "ISI 총점≠문항합",
  "S-08": "경계(ISI=15 / watch 6.9h → 통과)",
};

const SUBJECTS: Subject[] = IDS.map((id) => ({
  subject_id: id,
  site_id: "SITE-01",
  arm: "CBT-I 중재군",
  enroll_date: "2026-03-02",
  note: NOTES[id],
}));

// distribute a 0–28 total across 7 items (each 0–4), round-robin. total == sum always (except S-07 inject).
function isiItems(total: number): number[] {
  const it = [0, 0, 0, 0, 0, 0, 0];
  let t = Math.max(0, Math.min(28, Math.round(total)));
  for (let i = 0; t > 0 && i < 400; i++) if (it[i % 7] < 4) { it[i % 7]++; t--; }
  return it;
}

const assessments: SleepRow[] = [];
const watch: WatchRow[] = [];

SUBJECTS.forEach((s, si) => {
  const id = s.subject_id;
  for (let k = 0; k < TP; k++) {
    const date = dateAt(k);

    // basic trends (before injection): improving ISI/PHQ-9/GAD-7, increasing sleep; watch follows diary.
    let isi = Math.max(4, Math.round(18 - k * 1.4 + 2 * Math.sin(k + si)));
    let phq9 = Math.max(2, Math.round(11 - k * 0.9 + Math.sin(k * 1.3 + si)));
    let phq9_item9 = 0;
    const ess = Math.max(3, Math.round(9 + 2 * Math.sin(k * 0.7 + si)));
    const gad7 = Math.max(2, Math.round(9 - k * 0.5 + Math.sin(k + si)));
    let diary_tst = Math.min(480, Math.round(300 + k * 18 + 10 * Math.sin(k + si)));
    let watch_tst = diary_tst + Math.round(8 * Math.sin(k * 1.1 + si)); // 기본은 diary와 ±8분 이내
    let isi_total: number | undefined; // 보통 undefined
    let entry = `${date}T21:0${k % 6}`; // 기본 입력시각: 방문일 21:0X

    // ── seeded anomalies ──
    if (id === "S-06") isi = 16; // (a) 모든 회차 ISI=16 평탄
    if (id === "S-05" && k <= 4) entry = "2026-04-13T23:40"; // (b) k0..k4(5회) 입력일을 한 날로 클러스터
    if (k === 3) {
      // (c) W6 앵커에서만
      if (id === "S-02") { isi = 18; watch_tst = 462; } // 주관 중증 + 객관 양호(7.7h)
      if (id === "S-03") { phq9 = 16; phq9_item9 = 2; } // 안전 신호 (AE 없음 → 발화)
      if (id === "S-04") { phq9 = 16; phq9_item9 = 2; } // 안전 신호 (AE 있음 → 미발화)
      if (id === "S-08") { isi = 15; watch_tst = 414; } // 경계: watch 414 < 420 → 미발화
    }
    if (id === "S-07" && k === 2) isi_total = isi + 6; // (d) W4에서 총점만 +6 (문항합과 분리)

    const items = isiItems(isi);
    assessments.push({
      subject_id: id,
      date,
      isi_total: isi_total ?? isi,
      isi_items: items,
      ess_total: ess,
      phq9_total: phq9,
      phq9_item9,
      gad7_total: gad7,
      diary_tst,
      entry_timestamp: entry,
    });
    watch.push({ subject_id: id, date, watch_tst });
  }
});

const AE: AeRow[] = [{ subject_id: "S-04", ae_term: "우울감 모니터링", onset_date: dateAt(3) }];

export const T2_DATASET: Dataset = { subjects: SUBJECTS, assessments, watch, ae: AE };
