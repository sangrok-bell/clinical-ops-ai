import { useState } from "react";
import { Radar, ScanSearch, Brain, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CroDetection } from "./CroDetection";
import { CohortScan } from "./CohortScan";
import { ContextAnomalyView } from "./ContextAnomalyView";

// Step ④ 모니터링 — after the protocol/SOP review (①) and ePRO·EDC design (②) are
// locked, this is the monitoring phase: real-time per-patient detection (CRO), the
// cohort-wide batch scan, and context-conditional personalized anomaly detection (agent).
const VIEWS = [
  { k: "live" as const, label: "실시간 검출 (환자)", icon: Radar },
  { k: "cohort" as const, label: "전수 검증 (코호트)", icon: ScanSearch },
  { k: "context" as const, label: "맥락 이상 (개인화)", icon: Brain },
];

export function MonitoringStep({ onNext }: { onNext: () => void }) {
  const [view, setView] = useState<"live" | "cohort" | "context">("live");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1 self-start rounded-pill border border-[#eeeef4] bg-surface p-0.5">
        {VIEWS.map((t) => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand",
              view === t.k ? "bg-brand text-white" : "text-dim hover:bg-elevated",
            )}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {view === "live" ? <CroDetection /> : view === "cohort" ? <CohortScan /> : <ContextAnomalyView />}

      {onNext && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-elevated p-3">
          <span className="text-[11px] leading-relaxed text-dim">실시간 검출(환자 본인 기준)·전수 정합성 검증을 확인했으면 ⑤ 리뷰·쿼리로 넘어갑니다.</span>
          <Button variant="brand" className="ml-auto shrink-0" onClick={onNext}>다음: ⑤ 리뷰·쿼리 <ArrowRight className="size-4" /></Button>
        </div>
      )}
    </div>
  );
}
