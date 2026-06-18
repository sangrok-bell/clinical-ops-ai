// In-memory study database (local). Seeded at startup from a build-time JSON
// (public/data/study.json ← data/raw/*.csv via scripts/build-dataset.mjs).
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
  comorbidity: string; medication: string; height_cm: number | null; weight_kg: number | null; bmi: number | null; consent_date: string;
};
export type RespNight = {
  record_id: string; patient_id: string; date: string; dur_min: number | null; ahi: number | null;
  resp_rate: number | null; spo2_min: number | null; spo2_mean: number | null; apnea_n: number | null; snore_min: number | null; device: string;
};
export type DiaryNight = {
  record_id: string; patient_id: string; date: string; bedtime: string; sol_min: number | null;
  awakenings: number | null; waso_min: number | null; waketime: string; tst_min: number | null; quality: number | null; caffeine: string; alcohol: string; exercise: string;
};
export type PsgVisit = {
  record_id: string; patient_id: string; visit: string; date: string; tib_min: number | null; tst_min: number | null;
  sol_min: number | null; waso_min: number | null; se_pct: number | null; n1_pct: number | null; n2_pct: number | null;
  n3_pct: number | null; rem_pct: number | null; arousal_index: number | null; device: string; examiner: string;
};
export type AppLog = { record_id: string; patient_id: string; date: string; sessions: number | null; use_min: number | null; module: string; completed: string; app_version: string; os: string };

export type Study = { meta: { study: string; patients: number }; patients: Patient[]; psg: PsgVisit[]; resp: RespNight[]; diary: DiaryNight[]; applog: AppLog[] };

/** The contract the engine/screens use. Swap the implementation (in-memory ↔ EDC DB) without touching consumers. */
export interface StudyDb {
  ready: Promise<void>;
  meta(): Study["meta"] | null;
  patients(): Patient[];
  patient(id: string): Patient | undefined;
  resp(id: string): RespNight[];   // chronological
  diary(id: string): DiaryNight[]; // chronological
  psg(id: string): PsgVisit[];
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

  const ready = (async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`study.json load failed: ${r.status}`);
    study = (await r.json()) as Study;
    pMap = new Map(study.patients.map((p) => [p.patient_id, p]));
    respMap = index(study.resp);
    diaryMap = index(study.diary);
    psgMap = index(study.psg);
    for (const m of [respMap, diaryMap, psgMap]) for (const arr of m.values()) (arr as { date: string }[]).sort(byDate);
  })();

  return {
    ready,
    meta: () => study?.meta ?? null,
    patients: () => study?.patients ?? [],
    patient: (id) => pMap.get(id),
    resp: (id) => respMap.get(id) ?? [],
    diary: (id) => diaryMap.get(id) ?? [],
    psg: (id) => psgMap.get(id) ?? [],
    appendResp: (r) => { (respMap.get(r.patient_id) ?? respMap.set(r.patient_id, []).get(r.patient_id)!).push(r); study?.resp.push(r); },
    appendDiary: (d) => { (diaryMap.get(d.patient_id) ?? diaryMap.set(d.patient_id, []).get(d.patient_id)!).push(d); study?.diary.push(d); },
  };
}

// Single shared instance for the app (the "connected study database").
export const studyDb: StudyDb = createInMemoryStudyDb();
