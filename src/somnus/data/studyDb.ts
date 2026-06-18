// In-memory study database (local). Seeded at startup from a build-time JSON
// (public/data/study.json ← data/source/*.xlsx → data/raw/*.csv via scripts/build-dataset.mjs).
//
// ── Why an interface ────────────────────────────────────────────────────────
// The detection engine depends only on the `StudyDb` INTERFACE, never on this
// in-memory implementation. For the local demo we ship `createInMemoryStudyDb()`
// (a bundled JSON seed). In production you'd drop in a `createEdcStudyDb()` adapter
// backed by the real clinical/EDC database (e.g. Postgres + audit tables) — the
// engine and screens don't change. Data layer = swappable adapter; trust = the
// deterministic engine. (This is the "right-sized, not immature" architecture.)

export type Patient = {
  patient_id: string; enroll_date: string; birth_date: string; age: number | null; sex: string;
  arm: string; dx: string; dx_code: string; dx_date: string; baseline_isi: number | null;
  comorbidity: string; medication: string; height_cm: number | null; weight_kg: number | null; bmi: number | null;
  consent_date: string; watch_device?: string;
};
export type RespNight = {
  record_id: string; patient_id: string; date: string; dur_min: number | null; ahi: number | null;
  resp_rate: number | null; spo2_min: number | null; spo2_mean: number | null; apnea_n: number | null; snore_min: number | null; device: string;
};
export type DiaryNight = {
  record_id: string; patient_id: string; date: string; bedtime: string; sol_min: number | null;
  awakenings: number | null; waso_min: number | null; waketime: string; tst_min: number | null; quality: number | null;
  caffeine: string; alcohol: string; exercise: string; medication?: string; weekend?: string; stress?: string;
};
export type PsgVisit = {
  record_id: string; patient_id: string; visit: string; date: string; tib_min: number | null; tst_min: number | null;
  sol_min: number | null; waso_min: number | null; se_pct: number | null; n1_pct: number | null; n2_pct: number | null;
  n3_pct: number | null; rem_pct: number | null; arousal_index: number | null; device: string; examiner: string;
};
export type AppLog = { record_id: string; patient_id: string; date: string; sessions: number | null; use_min: number | null; module: string; completed: string; app_version: string; os: string };

// ── new domains (integrated dataset) ─────────────────────────────────────────
/** Daily self-reported ISI ePRO (new domain — submitted every day, not just at visits). */
export type IsiEpro = { record_id: string; patient_id: string; date: string; isi_total: number | null; submit_time: string; response_sec: number | null };
/** Daily smartwatch summary (objective sleep + vitals). */
export type WatchDaily = {
  record_id: string; patient_id: string; date: string; resting_hr: number | null; avg_hr: number | null; hrv: number | null;
  sleep_min: number | null; deep_min: number | null; rem_min: number | null; awake_min: number | null; steps: number | null;
  active_cal: number | null; spo2_min: number | null; wear_hr: number | null; sync_time: string;
};
/** Continuous (always-on) watch samples (~30-min cadence) — the SOP's 상시수집 시계데이터. */
export type WatchSample = { patient_id: string; time: string; hr: number | null; activity: string; sleep_stage: string; spo2: number | null };
/** Ground-truth answer keys (for precision/recall overlay). */
export type ErrorKey = { error_id: string; sheet: string; location: string; patient_id: string; error_type: string; column: string; entered: string; expected: string; detection: string; description: string; rule_id: string };
export type AnomalyKey = { anomaly_id: string; sheet: string; patient_id: string; night: string; signal: string; entered: string; global_check: string; context: string; context_expected: string; description: string };

export type Study = {
  meta: { study: string; patients: number; domains?: Record<string, number>; answer_keys?: Record<string, number> };
  patients: Patient[]; psg: PsgVisit[]; resp: RespNight[]; diary: DiaryNight[]; applog: AppLog[];
  isi_epro: IsiEpro[]; watch_daily: WatchDaily[]; watch_sample: WatchSample[]; error_key: ErrorKey[]; anomaly_key: AnomalyKey[];
};

/** The contract the engine/screens use. Swap the implementation (in-memory ↔ EDC DB) without touching consumers. */
export interface StudyDb {
  ready: Promise<void>;
  meta(): Study["meta"] | null;
  patients(): Patient[];
  patient(id: string): Patient | undefined;
  resp(id: string): RespNight[];   // chronological
  diary(id: string): DiaryNight[]; // chronological
  psg(id: string): PsgVisit[];
  // new domains
  isiEpro(id: string): IsiEpro[];      // chronological daily ISI
  watchDaily(id: string): WatchDaily[]; // chronological daily watch summary
  watchSample(id: string): WatchSample[]; // continuous samples (by time)
  errorKey(): ErrorKey[];               // ground-truth injected errors
  anomalyKey(): AnomalyKey[];           // ground-truth personalized anomalies
  /** Append a newly collected night to the live store (session-scoped accumulation). */
  appendResp(r: RespNight): void;
  appendDiary(d: DiaryNight): void;
}

const byDate = <T extends { date: string }>(a: T, b: T) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

function index<T extends { patient_id: string }>(rows: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) (m.get(r.patient_id) ?? m.set(r.patient_id, []).get(r.patient_id)!).push(r);
  return m;
}

export function createInMemoryStudyDb(url = "/data/study.json"): StudyDb {
  let study: Study | null = null;
  let pMap = new Map<string, Patient>();
  let respMap = new Map<string, RespNight[]>();
  let diaryMap = new Map<string, DiaryNight[]>();
  let psgMap = new Map<string, PsgVisit[]>();
  let isiMap = new Map<string, IsiEpro[]>();
  let wdMap = new Map<string, WatchDaily[]>();
  let wsMap = new Map<string, WatchSample[]>();

  const ready = (async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`study.json load failed: ${r.status}`);
    study = (await r.json()) as Study;
    pMap = new Map(study.patients.map((p) => [p.patient_id, p]));
    respMap = index(study.resp);
    diaryMap = index(study.diary);
    psgMap = index(study.psg);
    isiMap = index(study.isi_epro ?? []);
    wdMap = index(study.watch_daily ?? []);
    wsMap = index(study.watch_sample ?? []);
    for (const m of [respMap, diaryMap, psgMap, isiMap, wdMap]) for (const arr of m.values()) (arr as { date: string }[]).sort(byDate);
    for (const arr of wsMap.values()) arr.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  })();

  return {
    ready,
    meta: () => study?.meta ?? null,
    patients: () => study?.patients ?? [],
    patient: (id) => pMap.get(id),
    resp: (id) => respMap.get(id) ?? [],
    diary: (id) => diaryMap.get(id) ?? [],
    psg: (id) => psgMap.get(id) ?? [],
    isiEpro: (id) => isiMap.get(id) ?? [],
    watchDaily: (id) => wdMap.get(id) ?? [],
    watchSample: (id) => wsMap.get(id) ?? [],
    errorKey: () => study?.error_key ?? [],
    anomalyKey: () => study?.anomaly_key ?? [],
    appendResp: (r) => { (respMap.get(r.patient_id) ?? respMap.set(r.patient_id, []).get(r.patient_id)!).push(r); study?.resp.push(r); },
    appendDiary: (d) => { (diaryMap.get(d.patient_id) ?? diaryMap.set(d.patient_id, []).get(d.patient_id)!).push(d); study?.diary.push(d); },
  };
}

// Single shared instance for the app (the "connected study database").
export const studyDb: StudyDb = createInMemoryStudyDb();
