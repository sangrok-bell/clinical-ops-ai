// Build-time data step (NOT a runtime dependency): converts the study CSV export
// (data/raw/*.csv, produced from data/source/*.xlsx by scripts/xlsx_to_csv.py) into one
// typed JSON (public/data/study.json) that the in-memory study DB (src/somnus/data/studyDb.ts)
// fetches at startup. Pure Node, no deps.
//   run: python3 scripts/xlsx_to_csv.py && node scripts/build-dataset.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(ROOT, "data/raw");
const OUT = join(ROOT, "public/data/study.json");

// minimal RFC-4180-ish CSV parser (handles quoted fields + embedded commas/quotes)
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""));
}

const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));

function load(file, headerMap, numeric) {
  const rows = parseCsv(readFileSync(join(RAW, file), "utf8"));
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, i) => {
      const key = headerMap[h] ?? h;
      const raw = (r[i] ?? "").trim();
      o[key] = numeric.has(key) ? num(raw) : raw;
    });
    return o;
  });
}

// 01_환자정보 — now carries 워치기기ID (watch device) instead of 동의서서명일.
const patients = load("patients.csv", {
  patient_id: "patient_id", 등록일: "enroll_date", 생년월일: "birth_date", 나이: "age", 성별: "sex",
  군배정: "arm", 진단명: "dx", 진단코드: "dx_code", 진단일: "dx_date", baseline_ISI: "baseline_isi",
  동반질환: "comorbidity", 복용약물: "medication", 키_cm: "height_cm", 몸무게_kg: "weight_kg", BMI: "bmi", 워치기기ID: "watch_device", 동의서서명일: "consent_date",
}, new Set(["age", "baseline_isi", "height_cm", "weight_kg", "bmi"]));

// 02_뇌파측정 (PSG)
const psg = load("psg.csv", {
  record_id: "record_id", patient_id: "patient_id", 방문: "visit", 측정일: "date",
  TIB_min: "tib_min", TST_min: "tst_min", SOL_min: "sol_min", WASO_min: "waso_min", SE_pct: "se_pct",
  N1_pct: "n1_pct", N2_pct: "n2_pct", N3_pct: "n3_pct", REM_pct: "rem_pct", arousal_index: "arousal_index", 기기ID: "device", 검사자: "examiner",
}, new Set(["tib_min", "tst_min", "sol_min", "waso_min", "se_pct", "n1_pct", "n2_pct", "n3_pct", "rem_pct", "arousal_index"]));

// 03_호흡디텍팅 (resp)
const resp = load("resp.csv", {
  record_id: "record_id", patient_id: "patient_id", 측정일밤: "date", 측정시간_min: "dur_min", AHI: "ahi",
  평균호흡수: "resp_rate", 최저SpO2: "spo2_min", 평균SpO2: "spo2_mean", 무호흡횟수: "apnea_n", 코골이시간_min: "snore_min", 기기ID: "device",
}, new Set(["dur_min", "ahi", "resp_rate", "spo2_min", "spo2_mean", "apnea_n", "snore_min"]));

// 04_수면일기 (diary) — NEW column names (입면잠복_min/야간각성_min/주관수면질/오후카페인) + context (복약/주말/스트레스).
// English output keys are kept stable (sol_min/waso_min/tst_min/quality) so the engines don't change.
const diary = load("diary.csv", {
  record_id: "record_id", patient_id: "patient_id", 날짜: "date", 취침시각: "bedtime", 입면잠복_min: "sol_min",
  야간각성횟수: "awakenings", 야간각성_min: "waso_min", 기상시각: "waketime", 총수면시간_min: "tst_min",
  주관수면질: "quality", 음주: "alcohol", 오후카페인: "caffeine", 운동: "exercise", 복약: "medication", 주말: "weekend", 스트레스: "stress",
}, new Set(["sol_min", "awakenings", "waso_min", "tst_min", "quality"]));

// 05_ISI_ePRO_매일 — NEW: daily self-reported ISI (the new ePRO domain).
const isi_epro = load("isi_epro.csv", {
  record_id: "record_id", patient_id: "patient_id", 날짜: "date", ISI_total: "isi_total", 제출시각: "submit_time", 응답소요_초: "response_sec",
}, new Set(["isi_total", "response_sec"]));

// 06_와치_일별요약 — NEW: daily smartwatch summary (objective sleep + vitals).
const watch_daily = load("watch_daily.csv", {
  record_id: "record_id", patient_id: "patient_id", 날짜: "date", 안정시심박_bpm: "resting_hr", 평균심박_bpm: "avg_hr",
  HRV_ms: "hrv", 수면시간_min: "sleep_min", 깊은수면_min: "deep_min", REM_min: "rem_min", 각성_min: "awake_min",
  걸음수: "steps", 활동칼로리: "active_cal", 최저SpO2: "spo2_min", 착용시간_hr: "wear_hr", 동기화시각: "sync_time",
}, new Set(["resting_hr", "avg_hr", "hrv", "sleep_min", "deep_min", "rem_min", "awake_min", "steps", "active_cal", "spo2_min", "wear_hr"]));

// 07_와치_상시샘플 — NEW: continuous (always-on) watch samples (~30-min cadence).
const watch_sample = load("watch_sample.csv", {
  patient_id: "patient_id", 측정시각: "time", 심박_bpm: "hr", 활동: "activity", 수면단계: "sleep_stage", SpO2: "spo2",
}, new Set(["hr", "spo2"]));

// 08_앱사용로그 (applog)
const applog = load("applog.csv", {
  record_id: "record_id", patient_id: "patient_id", 사용일: "date", 세션수: "sessions", 총사용시간_min: "use_min",
  CBTI모듈: "module", 모듈완료여부: "completed", 앱버전: "app_version", OS: "os",
}, new Set(["sessions", "use_min"]));

// 09_오기입오류_정답지 — NEW: ground-truth error key (for precision/recall overlay).
const error_key = load("error_key.csv", {
  error_id: "error_id", 시트: "sheet", 위치: "location", patient_id: "patient_id", 오류유형: "error_type",
  컬럼: "column", 입력값: "entered", 기대값: "expected", 탐지방식: "detection", 설명: "description", 규칙ID: "rule_id",
}, new Set([]));

// 10_개인화이상_정답지 — NEW: ground-truth personalized-anomaly key (context-based; passes global checks).
const anomaly_key = load("anomaly_key.csv", {
  anomaly_id: "anomaly_id", 시트: "sheet", patient_id: "patient_id", 날짜_night: "night", 신호: "signal",
  입력값: "entered", 전역검사: "global_check", 맥락요약: "context", 맥락기대값_근사: "context_expected", 설명: "description",
}, new Set([]));

const out = {
  meta: {
    study: "SLEEP-DTx-301",
    patients: patients.length,
    generated_from: "data/source/insomnia_DTx_integrated_dataset.xlsx",
    domains: { isi_epro_daily: isi_epro.length, watch_daily: watch_daily.length, watch_continuous: watch_sample.length },
    answer_keys: { errors: error_key.length, anomalies: anomaly_key.length },
  },
  patients, psg, resp, diary, applog, isi_epro, watch_daily, watch_sample, error_key, anomaly_key,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
console.log(
  `study.json: ${patients.length} patients · psg ${psg.length} · resp ${resp.length} · diary ${diary.length} · applog ${applog.length}\n` +
  `  +new: isi_epro ${isi_epro.length} · watch_daily ${watch_daily.length} · watch_sample ${watch_sample.length} · error_key ${error_key.length} · anomaly_key ${anomaly_key.length}`,
);
