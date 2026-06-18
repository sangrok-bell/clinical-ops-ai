import { describe, it, expect } from "vitest";
import { analyzeSingle, analyzeBulk } from "./validate";
import { T2_DATASET } from "@/somnus/data/t2";

describe("analyzeSingle (entry-time)", () => {
  it("range: ISI total 40 → blocked", () => {
    const r = analyzeSingle({ subject_id: "X", isi_total: 40 });
    expect(r.ok).toBe(false);
    expect(r.findings.some((f) => f.channel === "range")).toBe(true);
  });
  it("scale consistency: ISI total ≠ item sum → flagged", () => {
    const r = analyzeSingle({ subject_id: "X", isi_total: 20, isi_items: [1, 1, 1, 1, 1, 1, 1] });
    expect(r.findings.some((f) => f.channel === "scale_consistency" && f.layer === "L2")).toBe(true);
  });
  it("consistent in-range assessment → ok", () => {
    const r = analyzeSingle({ subject_id: "X", isi_total: 10, isi_items: [2, 2, 2, 2, 1, 1, 0], phq9_total: 6, gad7_total: 5, ess_total: 8 });
    expect(r.ok).toBe(true);
    expect(r.route).toBe("통과");
  });
});

describe("analyzeBulk (insomnia cohort)", () => {
  const { summary, records } = analyzeBulk(T2_DATASET);
  const fired = (sid: string, channel: string) => records.some((r) => r.subject === sid && r.channel === channel);

  it("silent_pass invariant is 0", () => expect(summary.silent_pass).toBe(0));
  it("L3 cross-source fires on S-02, NOT on boundary S-08", () => {
    expect(fired("S-02", "triangulation")).toBe(true);
    expect(fired("S-08", "triangulation")).toBe(false);
  });
  it("safety fires on S-03 (no AE) but NOT S-04 (AE within ±7d)", () => {
    expect(fired("S-03", "safety_cross_form")).toBe(true);
    expect(fired("S-04", "safety_cross_form")).toBe(false);
  });
  it("backfilling fires on S-05", () => expect(fired("S-05", "timestamp_forensics")).toBe(true));
  it("flatlining (variance) fires on S-06", () => expect(fired("S-06", "variance_anomaly")).toBe(true));
  it("scale inconsistency fires on S-07", () => expect(fired("S-07", "scale_consistency")).toBe(true));
  it("safety routes to its own escalation queue", () => {
    expect(records.some((r) => r.route === "안전_에스컬레이션" && r.subject === "S-03")).toBe(true);
  });
  it("soft signals (triangulation) route to SDV, not the confirmed-query queue", () => {
    const t = records.find((r) => r.subject === "S-02" && r.channel === "triangulation");
    expect(t?.route).toBe("검토필요_SDV");
  });
});

// The config injected by ② is the live engine config — changing it changes flagging.
describe("config injection (② → engine)", () => {
  it("raising ISI_SEVERE above the cohort suppresses S-02 triangulation", () => {
    const tight = analyzeBulk(T2_DATASET, { ISI_SEVERE: 99 });
    expect(tight.records.some((r) => r.subject === "S-02" && r.channel === "triangulation")).toBe(false);
  });
  it("default config still fires it (proves the override, not a no-op)", () => {
    const base = analyzeBulk(T2_DATASET);
    expect(base.records.some((r) => r.subject === "S-02" && r.channel === "triangulation")).toBe(true);
  });
});
