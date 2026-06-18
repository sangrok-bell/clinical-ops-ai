import { useEffect, useState } from "react";
import { Loader2, ScanSearch, ShieldAlert, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { studyDb } from "@/somnus/data/studyDb";
import { scanCohort, type CohortReport, type Severity } from "@/somnus/engine/cohortScan";

const sevText: Record<Severity, string> = { Critical: "text-danger", Major: "text-warning", Minor: "text-dim" };
const sevDot: Record<Severity, string> = { Critical: "bg-danger", Major: "bg-warning", Minor: "bg-icon" };
const domainColor: Record<string, string> = { 환자정보: "text-brand", 호흡디텍팅: "text-info", 수면일기: "text-dim" };

export function CohortScan() {
  const [report, setReport] = useState<CohortReport | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    studyDb.ready.then(() => { if (alive) setReport(scanCohort(studyDb)); }).catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, []);

  if (err) return <div className="mx-auto max-w-2xl py-16 text-center text-sm text-dim">스터디 데이터셋을 불러오지 못했습니다. (public/data/study.json)</div>;
  if (!report) return <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 py-20 text-sm text-dim"><Loader2 className="size-4 animate-spin text-brand" /> 데이터셋 전수 스캔 중…</div>;

  const maxEc = Math.max(1, ...report.by_ec.map((e) => e.n));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">Cohort Scan · 데이터셋 전수 검증</p>
        <h1 className="text-[32px] font-bold leading-tight text-ink" style={{ fontFamily: "var(--font-display)" }}>전수 정합성 검증 — {report.patients}명 코호트</h1>
        <p className="max-w-3xl text-[15px] leading-relaxed text-dim">
          스터디 데이터베이스 전체(환자정보·호흡디텍팅·수면일기)를 <b className="text-ink">결정적 Edit Check + 환자 내 이상치</b>로 일괄 점검합니다.
          입력 시점 ePRO가 놓친 정합성 오류가 여기서 드러납니다.
        </p>
      </div>

      {/* headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "스캔 행수", v: report.scannedRows.toLocaleString(), tone: "text-ink" },
          { k: "검출된 이상", v: report.total.toLocaleString(), tone: "text-danger" },
          { k: "환자 기준 이상 ★", v: report.within_patient.toLocaleString(), tone: "text-warning" },
          { k: "플래그 대상자", v: `${report.flagged_patients}/${report.patients}`, tone: "text-ink" },
        ].map((c) => (
          <div key={c.k} className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
            <p className="text-[11px] text-dim">{c.k}</p>
            <p className={cn("mt-0.5 text-3xl font-bold tabular-nums", c.tone)}>{c.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* EC distribution */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface p-5">
          <div className="flex items-center gap-2">
            <ScanSearch className="size-4 text-brand" />
            <span className="text-sm font-semibold text-ink">Edit Check 별 검출 분포</span>
            <span className="ml-auto text-[11px] text-icon">
              Critical {report.by_severity.Critical} · Major {report.by_severity.Major} · Minor {report.by_severity.Minor}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {report.by_ec.map((e) => (
              <div key={e.ec} className="flex items-center gap-3">
                <span className="w-12 shrink-0 font-mono text-xs font-semibold text-ink">{e.ec}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-elevated">
                  <div className="h-full rounded-pill bg-brand" style={{ width: `${(e.n / maxEc) * 100}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-ink">{e.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* top patients */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface p-5">
          <p className="text-sm font-semibold text-ink">최다 플래그 대상자</p>
          <div className="mt-3 flex flex-col gap-2">
            {report.top_patients.map((p) => (
              <div key={p.patient_id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-ink">{p.patient_id}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-elevated"><div className="h-full rounded-pill bg-warning" style={{ width: `${(p.n / report.top_patients[0].n) * 100}%` }} /></div>
                <span className="w-6 text-right text-xs font-semibold tabular-nums text-dim">{p.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* answer-key overlay placeholder */}
      <div className="flex items-start gap-2 rounded-2xl border border-dashed border-[#dddde4] bg-surface p-3 text-[11px] leading-relaxed text-icon">
        <FileSearch className="mt-0.5 size-4 shrink-0 text-brand" />
        <span><b className="text-dim">검출률(precision/recall)</b>은 정답지 <code>99_오류정답지</code> 시트를 연결하면 여기에 표시됩니다 — "심은 오류 N건 중 M건 검출". 현재는 엔진이 데이터셋에서 자체 검출한 결과입니다.</span>
      </div>

      {/* sample findings */}
      <div className="overflow-hidden rounded-2xl border border-[#eeeef4] bg-surface">
        <div className="flex items-center gap-2 border-b border-[#eeeef4] bg-canvas px-4 py-2.5">
          <ShieldAlert className="size-4 text-danger" />
          <span className="text-sm font-semibold text-ink">검출 상세 (심각도순 · 상위 {report.sample.length}건)</span>
          <span className="ml-auto text-[11px] text-icon">총 {report.total.toLocaleString()}건</span>
        </div>
        <div className="max-h-[460px] divide-y divide-[#f1f1f5] overflow-y-auto">
          {report.sample.map((f, i) => (
            <div key={i} className="flex items-start gap-2 px-4 py-2.5">
              <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", sevDot[f.severity])} />
              <span className="w-12 shrink-0 font-mono text-[11px] text-ink">{f.patient_id}</span>
              <span className="w-12 shrink-0 font-mono text-[10px] text-icon">{f.ec}</span>
              <span className={cn("w-16 shrink-0 text-[10px]", domainColor[f.domain] ?? "text-dim")}>{f.domain}</span>
              <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink">{f.msg}</span>
              <span className={cn("shrink-0 text-[10px] font-semibold", sevText[f.severity])}>{f.severity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
