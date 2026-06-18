import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Step1Protocol } from "./Step1Protocol";
import { Step2Design } from "./Step2Design";
import { StudyMismatch } from "./StudyMismatch";
import { Step3Collect } from "@/somnus/collect/Step3Collect";
import { LIVE_SUBJECT } from "@/somnus/collect/PatientApp";
import { MonitoringStep } from "@/somnus/detect/MonitoringStep";
import { Step5Review } from "@/somnus/review/Step5Review";
import { Step6Lock } from "@/somnus/review/Step6Lock";
import { T2_DATASET } from "@/somnus/data/t2";
import { CONNECTED_STUDY, type StudyHandoff, type DesignResult } from "@/somnus/engine/design";
import { SLEEP_CONFIG, type Config, type SleepRow, type Dataset } from "@/somnus/engine/validate";

const STEP_NAMES = ["스터디 설계", "EDC·ePRO 설계", "데이터 수집", "모니터링", "데이터 리뷰", "데이터 마감"];

// Query lifecycle (nf/18·20 — supersedes the spec's Record<string,QueryStatus>).
export type QueryStatus = "issued" | "resolved";
export type Query = {
  key: string;
  text: string;
  status: QueryStatus;
  reason?: string;
  origin: "auto" | "manual";
  subject?: string;
  ec?: string;
};
export type Queries = Record<string, Query>;

// Calm position indicator — shows progress + next, never locks.
function SetupProgress({ idx }: { idx: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {STEP_NAMES.map((_, i) => (
          <span key={i} className={cn("h-1.5 w-6 rounded-full transition-colors", i <= idx ? "bg-brand" : "bg-[#dddde4]")} />
        ))}
      </div>
      <span className="text-xs text-dim">
        단계 {idx + 1}/6
        {STEP_NAMES[idx + 1] ? (
          <>
            {" · 다음 "}
            <span className="font-medium text-ink">{STEP_NAMES[idx + 1]}</span>
          </>
        ) : null}
      </span>
    </div>
  );
}

export function SetupShell() {
  const [idx, setIdx] = useState(0);
  const [handoff, setHandoff] = useState<StudyHandoff>({ docs: [] });
  const [config, setConfig] = useState<Config>(SLEEP_CONFIG);
  const [collected, setCollected] = useState<SleepRow[]>([]);
  const [queries, setQueries] = useState<Queries>({});
  const [design, setDesign] = useState<DesignResult | null>(null); // ② design state, lifted so back/forward preserves it

  const upsertQuery = (q: Query) => setQueries((m) => ({ ...m, [q.key]: { ...m[q.key], ...q } }));
  const updateQuery = (key: string, patch: Partial<Query>) => setQueries((m) => (m[key] ? { ...m, [key]: { ...m[key], ...patch } } : m));
  const removeQuery = (key: string) =>
    setQueries((m) => {
      const n = { ...m };
      delete n[key];
      return n;
    });
  const resolveQuery = (key: string, reason: string) =>
    setQueries((m) => ({ ...m, [key]: { ...(m[key] ?? { key, text: "", origin: "auto" as const }), status: "resolved", reason } }));

  const restart = () => {
    setIdx(0);
    setCollected([]);
    setQueries({});
    setHandoff({ docs: [] });
    setConfig(SLEEP_CONFIG);
    setDesign(null);
  };

  // Browser back/forward ↔ step idx, via the History API (no router needed — keeps the
  // single-idx shell, just makes the back/forward buttons walk the 6 steps).
  const fromPop = useRef(false);
  useEffect(() => {
    history.replaceState({ idx: 0 }, "", "#1");
    const onPop = (e: PopStateEvent) => {
      fromPop.current = true;
      setIdx(typeof e.state?.idx === "number" ? e.state.idx : 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (fromPop.current) {
      fromPop.current = false;
      return;
    }
    if (history.state?.idx === idx) return;
    history.pushState({ idx }, "", `#${idx + 1}`);
  }, [idx]);

  // Live dataset = seed insomnia cohort (T2) + ③ collected assessments (+ LIVE_SUBJECT meta when any).
  const dataset = useMemo<Dataset>(
    () => ({
      subjects: collected.length
        ? [...T2_DATASET.subjects, { subject_id: LIVE_SUBJECT, site_id: "SITE-02", arm: "CBT-I 중재군", enroll_date: "2026-06-08", note: "라이브 수집 대상자" }]
        : T2_DATASET.subjects,
      assessments: [...T2_DATASET.assessments, ...collected],
      watch: T2_DATASET.watch,
      ae: T2_DATASET.ae,
    }),
    [collected],
  );

  return (
    <>
      <header className="flex items-center justify-end border-b border-[#eeeef4] px-8 py-3">
        <SetupProgress idx={idx} />
      </header>

      <main className={cn("mx-auto w-full px-8 py-12", idx <= 4 ? "max-w-6xl" : "max-w-3xl")}>
        {idx === 0 ? (
          <Step1Protocol
            onComplete={(h) => {
              setHandoff(h);
              setIdx(1);
            }}
          />
        ) : idx === 1 ? (
          CONNECTED_STUDY.conforms(handoff.docAssessment) ? (
            <Step2Design handoff={handoff} config={config} onConfigChange={setConfig} onNext={() => setIdx(2)} design={design} onDesignChange={setDesign} />
          ) : (
            <StudyMismatch assessment={handoff.docAssessment} onBack={() => setIdx(0)} />
          )
        ) : idx === 2 ? (
          <Step3Collect config={config} onNext={() => setIdx(3)} onCollect={(row) => setCollected((c) => [...c, row])} collectedCount={collected.length} />
        ) : idx === 3 ? (
          <MonitoringStep onNext={() => setIdx(4)} />
        ) : idx === 4 ? (
          <Step5Review
            dataset={dataset}
            config={config}
            liveCount={collected.length}
            queries={queries}
            onIssue={upsertQuery}
            onUpdate={updateQuery}
            onRemove={removeQuery}
            onNext={() => setIdx(5)}
          />
        ) : (
          <Step6Lock dataset={dataset} config={config} queries={queries} onResolve={resolveQuery} onRestart={restart} />
        )}
      </main>
    </>
  );
}
