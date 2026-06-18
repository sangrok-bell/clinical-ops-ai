// Data↔protocol conformance mismatch panel (spec/10 §3).
// Shown by the shell at idx===1 when CONNECTED_STUDY.conforms(docAssessment) is false.
// Pure display + single back action — the only way forward is to re-upload a
// conforming document via ① (the gate is hard, not advisory).

import { AlertTriangle, ArrowLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONNECTED_STUDY } from "@/somnus/engine/design";
import { type DocAssessment } from "@/somnus/engine/protocol";

export function StudyMismatch({ assessment, onBack }: { assessment?: DocAssessment; onBack: () => void }) {
  const area = assessment?.therapeutic_area || "다른 적응증";
  const expected = assessment?.expected_measures ?? [];

  return (
    <div className="mx-auto flex max-w-3xl animate-[fadeIn_320ms_ease-out] flex-col gap-6">
      {/* (a) header */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">Study Build · 데이터 설계</p>
        <h1 className="text-[28px] font-bold leading-tight text-ink" style={{ fontFamily: "var(--font-display)" }}>
          데이터·프로토콜 적합성 점검
        </h1>
        <p className="text-[15px] leading-relaxed text-dim">
          승인 문서는 검토됐지만, <b className="text-ink">이 플랫폼에 연결된 데이터셋</b>과 프로토콜이 맞지 않습니다. 잘못된 문서이거나, 이 프로토콜에 맞는 데이터가 아직 연결되지 않은 상태입니다.
        </p>
      </div>

      {/* (b) warning banner */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-warning/40 bg-[#fef6e7] p-4">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">프로토콜과 연결 데이터셋 불일치</p>
          <p className="mt-0.5 text-xs leading-relaxed text-dim">
            업로드된 프로토콜은 <b className="text-ink">{area}</b> 적응증으로 보입니다. 이 인스턴스에 연결된 데이터셋은{" "}
            <b className="text-ink">{CONNECTED_STUDY.label}</b>({CONNECTED_STUDY.domain})이라, 프로토콜이 기대하는 측정과 수집되는 데이터가 일치하지 않습니다.
          </p>
        </div>
      </div>

      {/* (c) comparison grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* left: protocol expectation (①) */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-dim">프로토콜 기대 (①)</p>
          <p className="mt-1 text-sm font-semibold text-ink">{area}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {expected.length === 0 ? (
              <span className="text-[11px] text-icon">기대 측정 미상</span>
            ) : (
              expected.map((m, i) => (
                <span key={i} className="rounded-pill bg-elevated px-2 py-0.5 text-[11px] text-ink">
                  {m}
                </span>
              ))
            )}
          </div>
        </div>

        {/* right: connected dataset */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
          <div className="flex items-center gap-1.5">
            <Database className="size-3.5 text-brand" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-dim">연결 데이터셋</p>
          </div>
          <p className="mt-1 text-sm font-semibold text-ink">{CONNECTED_STUDY.domain}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CONNECTED_STUDY.measures.map((m) => (
              <span key={m} className="rounded-pill bg-[#eef3f9] px-2 py-0.5 text-[11px] font-medium text-info">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* (d) action row */}
      <div className="flex items-center gap-3">
        <Button variant="brand" onClick={onBack}>
          <ArrowLeft className="size-4" />
          다른 문서 올리기
        </Button>
        <span className="text-xs leading-relaxed text-dim">새 적응증은 검증 구성(척도·규칙·코호트)을 온보딩한 뒤 연결됩니다.</span>
      </div>
    </div>
  );
}
