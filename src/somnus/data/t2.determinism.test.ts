import { describe, it, expect } from "vitest";
import { analyzeBulk } from "@/somnus/engine/validate";
import { T2_DATASET } from "@/somnus/data/t2";

// Guards the seed's deterministic output against spec/07 §6·§8 — including the INCIDENTAL
// flatline firings the source-comment headlines don't mention. If the float trend formula
// drifts (Math.sin / rounding boundary), these counts change and this test catches it.
describe("T2 determinism (spec/07 §6·§8)", () => {
  const { summary, records } = analyzeBulk(T2_DATASET);
  const count = (ch: string) => records.filter((r) => r.channel === ch).length;
  const subjectsOf = (ch: string) => [...new Set(records.filter((r) => r.channel === ch).map((r) => r.subject))].sort();

  it("shape: 8 subjects × 7 TP", () => {
    expect(T2_DATASET.subjects).toHaveLength(8);
    expect(T2_DATASET.assessments).toHaveLength(56);
    expect(T2_DATASET.watch).toHaveLength(56);
    expect(T2_DATASET.ae).toHaveLength(1);
  });

  it("channel firing counts (headline + incidental)", () => {
    expect(count("range")).toBe(0);
    expect(count("scale_consistency")).toBe(1); // S-07
    expect(count("triangulation")).toBe(1); // S-02
    expect(count("safety_cross_form")).toBe(1); // S-03
    expect(count("timestamp_forensics")).toBe(1); // S-05
    expect(count("variance_anomaly")).toBe(4); // S-03, S-04, S-05, S-06
  });

  it("variance_anomaly fires on S-03, S-04, S-05, S-06 (incidental flatlines)", () => {
    expect(subjectsOf("variance_anomaly")).toEqual(["S-03", "S-04", "S-05", "S-06"]);
  });

  it("S-01 and S-08 are clean (no findings)", () => {
    expect(records.some((r) => r.subject === "S-01")).toBe(false);
    expect(records.some((r) => r.subject === "S-08")).toBe(false);
  });

  it("silent_pass invariant", () => expect(summary.silent_pass).toBe(0));
});
