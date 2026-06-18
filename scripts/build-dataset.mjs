// Build-time data step (NOT a runtime dependency): converts the study CSV export
// (data/raw/*.csv) into one typed JSON (public/data/study.json) that the in-memory
// study DB (src/somnus/data/studyDb.ts) fetches at startup. Pure Node, no deps.
//   run: node scripts/build-dataset.mjs
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

const patients = load("patients.csv", {
  patient_id: "patient_id", 등록일: "enroll_date", 생년월일: "birth_date", 나이: "age", 성별: "sex",
  군배정: "arm", 진단명: "dx", 진단코드: "dx_code", 진단일: "dx_date", baseline_ISI: "baseline_isi",
  동반질환: "comorbidity", 복용약물: "medication", 키_cm: "height_cm", 몸무게_kg: "weight_kg", BMI: "bmi", 동의서서명일: "consent_date",
}, new Set(["age", "baseline_isi", "height_cm", "weight_kg", "bmi"]));

const psg = load("psg.csv", {
  record_id: "record_id", patient_id: "patient_id", 방문: "visit", 측정일: "date",
  TIB_min: "tib_min", TST_min: "tst_min", SOL_min: "sol_min", WASO_min: "waso_min", SE_pct: "se_pct",
  N1_pct: "n1_pct", N2_pct: "n2_pct", N3_pct: "n3_pct", REM_pct: "rem_pct", arousal_index: "arousal_index", 기기ID: "device", 검사자: "examiner",
}, new Set(["tib_min", "tst_min", "sol_min", "waso_min", "se_pct", "n1_pct", "n2_pct", "n3_pct", "rem_pct", "arousal_index"]));

const resp = load("resp.csv", {
  record_id: "record_id", patient_id: "patient_id", 측정일밤: "date", 측정시간_min: "dur_min", AHI: "ahi",
  평균호흡수: "resp_rate", 최저SpO2: "spo2_min", 평균SpO2: "spo2_mean", 무호흡횟수: "apnea_n", 코골이시간_min: "snore_min", 기기ID: "device",
}, new Set(["dur_min", "ahi", "resp_rate", "spo2_min", "spo2_mean", "apnea_n", "snore_min"]));

const diary = load("diary.csv", {
  record_id: "record_id", patient_id: "patient_id", 날짜: "date", 취침시각: "bedtime", 잠들기까지_min: "sol_min",
  야간각성횟수: "awakenings", 야간각성시간_min: "waso_min", 기상시각: "waketime", 총수면시간_min: "tst_min",
  주관적수면질: "quality", 카페인: "caffeine", 음주: "alcohol", 운동: "exercise",
}, new Set(["sol_min", "awakenings", "waso_min", "tst_min", "quality"]));

const applog = load("applog.csv", {
  record_id: "record_id", patient_id: "patient_id", 사용일: "date", 세션수: "sessions", 총사용시간_min: "use_min",
  CBTI모듈: "module", 모듈완료여부: "completed", 앱버전: "app_version", OS: "os",
}, new Set(["sessions", "use_min"]));

const out = { meta: { study: "SLEEP-DTx-301", patients: patients.length, generated_from: "data/raw/*.csv" }, patients, psg, resp, diary, applog };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
console.log(`study.json: ${patients.length} patients · psg ${psg.length} · resp ${resp.length} · diary ${diary.length} · applog ${applog.length}`);
