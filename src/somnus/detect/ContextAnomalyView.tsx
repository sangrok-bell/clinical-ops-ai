import { useEffect, useMemo, useState } from "react";
import { Loader2, Brain, TrendingUp, TrendingDown, ShieldCheck, Sparkles, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { studyDb } from "@/somnus/data/studyDb";
import { scanContextAnomalies, contextRecall, type ContextAnomaly } from "@/somnus/engine/contextCheck";

type Verdict = { verdict: "context_anomaly" | "explainable"; confidence: "high" | "low"; rationale: string; source?: string };
const famOfSignal = (s: string) => (s.includes("입면") ? "sol" : s.includes("ISI") ? "isi" : s.includes("심박") ? "hr" : "?");
const ckey = (c: ContextAnomaly) => `${c.patient_id}:${c.fam}:${c.date}`;

export function ContextAnomalyView() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    studyDb.ready.then(() => setReady(true)).catch(() => setReady(true));
  }, []);

  const { candidates, recall, keySet } = useMemo(() => {
    if (!ready) return { candidates: [] as ContextAnomaly[], recall: null as ReturnType<typeof contextRecall> | null, keySet: new Set<string>() };
    const c = scanContextAnomalies(studyDb);
    const ks = new Set(studyDb.anomalyKey().map((a) => `${a.patient_id}:${famOfSignal(a.signal)}`));
    return { candidates: c, recall: contextRecall(studyDb, c), keySet: ks };
  }, [ready]);

  const [verdicts, setVerdicts] = useState<Record<string, Verdict | "loading">>({});
  const [batchRunning, setBatchRunning] = useState(false);

  // fetch one verdict; updates the shared verdicts map (so per-row badges reflect it)
  const judgeOne = async (c: ContextAnomaly) => {
    const k = ckey(c);
    setVerdicts((v) => ({ ...v, [k]: "loading" }));
    try {
      const r = await fetch("/api/context-anomaly", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ candidate: c }) });
      const data = (await r.json()) as Verdict;
      setVerdicts((v) => ({ ...v, [k]: data }));
    } catch {
      setVerdicts((v) => ({ ...v, [k]: { verdict: "context_anomaly", confidence: "low", rationale: `${c.msg} (호출 실패 — 사람 검토)` } }));
    }
  };
  const judge = (c: ContextAnomaly) => void judgeOne(c);

  // batch judge the displayed candidates with a tiny bounded-concurrency pool (≤5 in flight)
  const judgeAll = async (list: ContextAnomaly[]) => {
    if (batchRunning) return;
    setBatchRunning(true);
    try {
      const LIMIT = 5;
      let next = 0;
      const worker = async () => {
        while (next < list.length) {
          const c = list[next++];
          await judgeOne(c);
        }
      };
      await Promise.all(Array.from({ length: Math.min(LIMIT, list.length) }, () => worker()));
    } finally {
      setBatchRunning(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[#eeeef4] bg-surface px-5 py-6">
        <Loader2 className="size-5 animate-spin text-brand" /> <span className="text-sm text-dim">스터디 DB 로드 · 맥락 기준선 계산 중…</span>
      </div>
    );
  }

  // surface validated (answer-key) matches first, then by |z|
  const ranked = [...candidates].sort((a, b) => {
    const av = keySet.has(`${a.patient_id}:${a.fam}`) ? 1 : 0;
    const bv = keySet.has(`${b.patient_id}:${b.fam}`) ? 1 : 0;
    return bv - av || Math.abs(b.z) - Math.abs(a.z);
  });
  const shown = ranked.slice(0, 24);

  // ── scoreboard metrics (driven by the shared `verdicts` map) ──
  const aiConfirmed = shown.filter((c) => {
    const v = verdicts[ckey(c)];
    return v && v !== "loading" && v.verdict === "context_anomaly";
  });
  const aiConfirmedCount = aiConfirmed.length;
  // precision = AI확정 중 정답지 매칭 비율
  const aiConfirmedKeyHits = aiConfirmed.filter((c) => keySet.has(`${c.patient_id}:${c.fam}`)).length;
  const precision = aiConfirmedCount > 0 ? aiConfirmedKeyHits / aiConfirmedCount : 0;
  // 정답지(patient:fam) 집합 — recall(AI확정) 계산용
  const answerFamSet = recall ? new Set(recall.detail.map((d) => `${d.patient_id}:${famOfSignal(d.signal)}`)) : new Set<string>();
  const aiConfirmedFamSet = new Set(aiConfirmed.map((c) => `${c.patient_id}:${c.fam}`));
  const recallAiHits = [...answerFamSet].filter((k) => aiConfirmedFamSet.has(k)).length;
  const recallTotal = recall ? recall.total : 0;
  const recallDeterministic = recallTotal > 0 ? recall!.recall / recallTotal : 0;
  const recallAi = recallTotal > 0 ? recallAiHits / recallTotal : 0;
  const anyVerdict = shown.some((c) => {
    const v = verdicts[ckey(c)];
    return v && v !== "loading";
  });
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const hasKey = keySet.size > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* summary / recall */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#eeeef4] bg-surface px-5 py-4">
        <Brain className="size-5 text-brand" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">맥락 조건부 개인화 이상탐지 <span className="text-dim">· 다중조건</span></p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-dim">전역 범위·단순 통계는 <b className="text-ink">통과</b>하나 환자 본인의 맥락(음주·카페인·운동·스트레스)·추세 대비 어긋난 값을 결정적 필터로 surfacing → AI 에이전트가 맥락 추론으로 판정.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {recall && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#f3f7e0] px-2.5 py-1 text-[11px] font-medium text-[#4d6a0f]">
              <ShieldCheck className="size-3.5" /> 정답지 검증 {recall.recall}/{recall.total} · 후보 {candidates.length}건
            </span>
          )}
          <Button size="sm" variant="outline" disabled={batchRunning} onClick={() => judgeAll(shown)}>
            {batchRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Brain className="size-3.5" />} 전체 AI 판정
          </Button>
        </div>
      </div>

      {/* precision / recall scoreboard (batch AI judgment) */}
      {(anyVerdict || batchRunning) && (
        <div className="overflow-hidden rounded-2xl border border-[#eeeef4] bg-surface">
          <div className="flex items-center gap-2 border-b border-[#eeeef4] bg-canvas px-4 py-2.5">
            <Gauge className="size-4 text-brand" />
            <span className="text-sm font-semibold text-ink">정밀도·재현율 스코어보드</span>
            {batchRunning && <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-dim"><Loader2 className="size-3 animate-spin" /> 배치 판정 중…</span>}
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#f1f1f5] sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "결정적 후보 전체", value: `${candidates.length}`, sub: "룰 필터 통과" },
              { label: "표시 후보", value: `${shown.length}`, sub: "상위 노출" },
              { label: "AI 확정", value: `${aiConfirmedCount}`, sub: "맥락 이상 판정" },
              { label: "precision", value: pct(precision), sub: `${aiConfirmedKeyHits}/${aiConfirmedCount} 정답지 매칭` },
              { label: "recall (결정적)", value: pct(recallDeterministic), sub: `${recall ? recall.recall : 0}/${recallTotal}` },
              { label: "recall (AI 확정)", value: pct(recallAi), sub: `${recallAiHits}/${recallTotal}` },
            ].map((m) => (
              <div key={m.label} className="bg-surface px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-icon">{m.label}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{m.value}</p>
                <p className="text-[10px] leading-tight text-dim">{m.sub}</p>
              </div>
            ))}
          </div>
          <p className="border-t border-[#eeeef4] bg-canvas px-4 py-2 text-[11px] leading-relaxed text-dim">
            {hasKey
              ? <>prod(키 있음) = AI 가지치기로 오탐 제거 → <b className="text-ink">precision ↑</b></>
              : <>dev(키 없음) = 룰 폴백이라 전부 확정 → <b className="text-ink">precision 낮음</b></>}
          </p>
        </div>
      )}

      {/* answer-key recall detail */}
      {recall && (
        <div className="flex flex-wrap gap-1.5">
          {recall.detail.map((d) => (
            <span key={d.id} className={cn("rounded-pill px-2 py-0.5 text-[10px] font-medium", d.caught ? "bg-[#f3f7e0] text-[#4d6a0f]" : "bg-[#fdecec] text-danger")}>
              {d.id} {d.patient_id} {d.caught ? "✓" : "✗"}
            </span>
          ))}
        </div>
      )}

      {/* candidate list */}
      <div className="overflow-hidden rounded-2xl border border-[#eeeef4] bg-surface">
        <div className="flex items-center gap-2 border-b border-[#eeeef4] bg-canvas px-4 py-2.5">
          <Sparkles className="size-4 text-brand" />
          <span className="text-sm font-semibold text-ink">맥락 이상 후보 · 상위 {shown.length}</span>
          <span className="ml-auto text-[11px] text-icon">편차순 · 정답지 매칭 우선</span>
        </div>
        <div className="divide-y divide-[#f1f1f5]">
          {shown.map((c) => {
            const k = ckey(c);
            const v = verdicts[k];
            const isKey = keySet.has(`${c.patient_id}:${c.fam}`);
            return (
              <div key={k} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-ink">{c.patient_id}</span>
                  <span className="text-[11px] text-dim">{c.signal}</span>
                  <span className={cn("inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-[10px] font-medium", c.direction === "high" ? "bg-[#fdecec] text-danger" : "bg-[#eef3f9] text-info")}>
                    {c.direction === "high" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {c.value}{c.unit} · z={c.z}
                  </span>
                  <span className="rounded-pill bg-elevated px-2 py-0.5 text-[10px] text-dim">기대 {c.expected}{c.unit}</span>
                  {isKey && <span className="rounded-pill bg-[#f3f7e0] px-2 py-0.5 text-[10px] font-medium text-[#4d6a0f]">정답지</span>}
                </div>
                <p className="text-[11px] leading-relaxed text-dim">{c.msg}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-icon">맥락: {c.context} · {c.baseline}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {v === "loading" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-dim"><Loader2 className="size-3 animate-spin" /> AI 판정 중…</span>
                    ) : v ? (
                      <span className={cn("inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium", v.verdict === "context_anomaly" ? "bg-[#fdecec] text-danger" : "bg-elevated text-dim")}>
                        {v.verdict === "context_anomaly" ? "맥락 이상" : "설명 가능"} · {v.confidence}{v.source === "seed" ? " (룰)" : ""}
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => judge(c)}><Brain className="size-3.5" /> AI 맥락 판정</Button>
                    )}
                  </div>
                </div>
                {v && v !== "loading" && <p className="rounded-lg bg-elevated px-2.5 py-1.5 text-[11px] leading-relaxed text-dim">{v.rationale}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
