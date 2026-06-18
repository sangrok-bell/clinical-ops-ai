import { describe, it, expect } from "vitest";
import { checkNight, type NightInput } from "./patientCheck";
import type { Patient, RespNight, DiaryNight } from "@/somnus/data/studyDb";

const patient: Patient = { patient_id: "PX", enroll_date: "", birth_date: "", age: 40, sex: "F", arm: "Active(DTx)", dx: "", dx_code: "", dx_date: "", baseline_isi: 20, comorbidity: "", medication: "", height_cm: null, weight_kg: null, bmi: null, consent_date: "" };

// 30 nights with a TIGHT SpO2 baseline (≈97 ± 1) — typical of a stable patient
const resp: RespNight[] = Array.from({ length: 30 }, (_, i) => ({ record_id: `B${i}`, patient_id: "PX", date: `2026-01-${String(i + 1).padStart(2, "0")}`, dur_min: 420, ahi: 4, resp_rate: 15, spo2_min: 95, spo2_mean: 97 + (i % 2 ? 1 : -1), apnea_n: 5, snore_min: 10, device: "R" }));
const diary: DiaryNight[] = Array.from({ length: 30 }, (_, i) => ({ record_id: `D${i}`, patient_id: "PX", date: `2026-01-${String(i + 1).padStart(2, "0")}`, bedtime: "23:30", sol_min: 20, awakenings: 1, waso_min: 20, waketime: "07:00", tst_min: 410, quality: 3, caffeine: "N", alcohol: "N", exercise: "N" }));
const base: NightInput = { date: "2026-02-01", dur_min: 420, ahi: 4, resp_rate: 15, spo2_min: 95, spo2_mean: 97, snore_min: 10, bedtime: "23:30", waketime: "07:00", sol_min: 20, waso_min: 20, awakenings: 1, tst_min: 410, quality: 3 };

describe("patientCheck — within-patient detection", () => {
  it("SpO2 91 is population-OK but abnormal for THIS patient (the headline feature)", () => {
    const f = checkNight(patient, { ...base, spo2_mean: 91, spo2_min: 90 }, { resp, diary });
    const wp = f.find((x) => x.key === "spo2_mean" && x.kind === "within_patient");
    expect(wp).toBeTruthy();
    expect(wp?.population_ok).toBe(true);                 // 91 ∈ [70,100] → standard EDC passes it
    expect(Math.abs(wp!.baseline!.z)).toBeGreaterThan(3); // but it's a >3σ outlier for this patient
  });
  it("a normal night for this patient → no findings", () => {
    expect(checkNight(patient, base, { resp, diary })).toHaveLength(0);
  });
  it("range violation (SpO2 105) → population EC-01, not within-patient", () => {
    const r = checkNight(patient, { ...base, spo2_mean: 105 }, { resp, diary }).find((x) => x.key === "spo2_mean");
    expect(r?.kind).toBe("population");
    expect(r?.ec).toBe("EC-01");
  });
  it("EC-12 cross-field: 최저SpO2 > 평균SpO2", () => {
    expect(checkNight(patient, { ...base, spo2_min: 99, spo2_mean: 95 }, { resp, diary }).some((x) => x.ec === "EC-12")).toBe(true);
  });
  it("EC-03 diary logic: TST exceeds time in bed", () => {
    expect(checkNight(patient, { ...base, tst_min: 600 }, { resp, diary }).some((x) => x.ec === "EC-03")).toBe(true);
  });
});
