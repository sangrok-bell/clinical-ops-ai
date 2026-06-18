import { useState } from "react";
import {
  Smartphone,
  ArrowRight,
  Inbox,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PatientApp, LIVE_SUBJECT } from "@/somnus/collect/PatientApp";
import type { Config, SleepRow, ValFinding } from "@/somnus/engine/validate";

type Submission = { id: number; row: SleepRow; findings: ValFinding[] };

// FlagRow의 sevStyle (PatientApp과 라벨이 다름)
const sevStyle: Record<
  ValFinding["severity"],
  { dot: string; text: string; edge: string; label: string }
> = {
  block: { dot: "bg-danger", text: "text-danger", edge: "border-l-danger", label: "검토 필요" },
  critical: { dot: "bg-danger", text: "text-danger", edge: "border-l-danger", label: "검토 필요" },
  high: { dot: "bg-warning", text: "text-warning", edge: "border-l-warning", label: "확인" },
  medium: { dot: "bg-warning", text: "text-warning", edge: "border-l-warning", label: "확인" },
  low: { dot: "bg-warning", text: "text-warning", edge: "border-l-warning", label: "참고" },
};

// AI 설명 호출 (/api/explain)
async function askExplain(f: ValFinding): Promise<string> {
  try {
    const r = await fetch("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        finding: { layer: f.layer, sev: f.severity, field: f.subject, msg: f.msg },
      }),
    });
    if (!r.ok) throw new Error();
    return (await r.json()).explanation || f.msg;
  } catch {
    return `${f.layer} 계층 · ${f.msg} — 원자료와 대조해 처리하세요.`;
  }
}

function FlagRow({ f }: { f: ValFinding }) {
  const [expl, setExpl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const s = sevStyle[f.severity];
  const ask = async () => {
    setLoading(true);
    setExpl(await askExplain(f));
    setLoading(false);
  };
  return (
    <div className={cn("rounded-xl border border-[#eeeef4] border-l-4 bg-canvas p-3", s.edge)}>
      <div className="flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", s.dot)} />
        <span className={cn("text-xs font-semibold", s.text)}>{s.label}</span>
        <span className="rounded-pill bg-elevated px-1.5 py-0.5 text-[9px] font-medium text-dim">
          {f.layer}
        </span>
        <button
          onClick={ask}
          disabled={loading || !!expl}
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline disabled:text-icon disabled:no-underline"
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Sparkles className="size-3" />
          )}
          {expl ? "설명됨" : "AI 설명"}
        </button>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-dim">{f.msg}</p>
      {expl && (
        <p className="mt-1.5 rounded-md bg-elevated p-2 text-[11px] leading-relaxed text-ink">
          <span className="font-semibold text-brand">AI 검토 </span>
          {expl}
        </p>
      )}
    </div>
  );
}

function SubmissionCard({ s }: { s: Submission }) {
  const r = s.row;
  return (
    <div className="animate-[fadeIn_240ms_ease-out] rounded-xl border border-[#eeeef4] bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-ink">{r.subject_id}</span>
        <span className="rounded-pill bg-elevated px-1.5 py-0.5 text-[10px] text-dim">
          불면 DTx
        </span>
        <span className="text-[10px] text-icon">
          {r.date} · 수신 #{s.id + 1}
        </span>
        {s.findings.length === 0 ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-[#4d6a0f]">
            <Check className="size-3" />
            정상 수신
          </span>
        ) : (
          <span className="ml-auto text-[11px] font-semibold text-danger">
            검토 필요 {s.findings.length}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-dim">
        <span>ISI {r.isi_total}</span>
        <span>ESS {r.ess_total}</span>
        <span>PHQ-9 {r.phq9_total}</span>
        <span>자살사고 {r.phq9_item9}</span>
        <span>GAD-7 {r.gad7_total}</span>
        <span>수면 {(r.diary_tst / 60).toFixed(1)}h</span>
      </div>
      {s.findings.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {s.findings.map((f, i) => (
            <FlagRow key={i} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformInbox({
  subs,
  onNext,
}: {
  subs: Submission[];
  onNext?: () => void;
}) {
  const flagged = subs.filter((s) => s.findings.length > 0).length;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* 헤더 바 */}
      <div className="flex items-center gap-2 rounded-2xl border border-[#eeeef4] bg-surface px-4 py-2.5">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-positive" />
        </span>
        <span className="text-sm font-semibold text-ink">
          Clinical Gandalf · 데이터 수신
        </span>
        <span className="ml-auto text-xs text-dim">
          수신 {subs.length} · 검토 필요 {flagged}
        </span>
      </div>

      {/* 본문 */}
      {subs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#dddde4] py-12 text-center">
          <Inbox className="size-6 text-icon" />
          <p className="text-sm text-dim">
            환자 앱에서 <b className="text-ink">[제출]</b>하면 여기로 실시간 수신됩니다.
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-icon">
            왼쪽은 환자 기기(별도 앱). 입력 시점에 검증된 데이터가 플랫폼으로 들어오고,
            그대로 ④·⑤ 검증 대상에 합류합니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {subs.map((s) => (
            <SubmissionCard key={s.id} s={s} />
          ))}
        </div>
      )}

      {/* 비교 박스 (항상) */}
      <div className="rounded-xl bg-elevated p-3 text-[11px] leading-relaxed text-dim">
        표준 EDC는 데이터가 <b className="text-ink">저장·전송된 뒤에야</b> 이상을 발견합니다 —
        여기선 <b className="text-ink">입력 시점에 이미 걸러져</b> 들어오고, 환자가 그대로
        제출한 항목만 DM 검토(④·⑤)로 올라옵니다.
      </div>

      {/* 다음 버튼 */}
      {onNext && (
        <Button
          variant="surface"
          className="self-start"
          onClick={onNext}
          disabled={subs.length === 0}
        >
          다음: 모니터링 <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}

export function Step3Collect({
  config,
  onNext,
  onCollect,
  collectedCount = 0,
}: {
  config?: Config;
  onNext?: () => void;
  onCollect?: (row: SleepRow) => void;
  collectedCount?: number;
}) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const push = (p: { row: SleepRow; findings: ValFinding[] }) => {
    setSubs((prev) => [{ id: prev.length, ...p }, ...prev]);
    onCollect?.(p.row);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 블록 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">
          Data Collection · 데이터 수집
        </p>
        <h1
          className="text-[32px] font-bold leading-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          환자 입력 → 플랫폼 수신
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-dim">
          환자 ePRO 앱은 <b className="text-ink">우리 플랫폼 화면이 아니라 환자에게 배포되는 별도 앱</b>입니다(②에서 확정한 설계 vD1.0). 환자가 입력하면 <b className="text-ink">입력 시점에 검증</b>되고, 그 데이터가 <b className="text-ink">그대로 ④·⑤의 검증 대상에 합류</b>합니다 — {LIVE_SUBJECT} 대상자 {collectedCount}건 수집됨.
        </p>
      </div>

      {/* Split view 그리드 */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* 왼쪽 칼럼 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-[#eeeef4] bg-surface px-4 py-2.5">
            <Smartphone className="size-4 text-brand" />
            <span className="text-sm font-semibold text-ink">
              환자 기기 · ePRO 앱
            </span>
            <span className="rounded-pill bg-elevated px-2 py-0.5 text-[10px] text-dim">
              별도 배포 · 설계 vD1.0
            </span>
          </div>
          <PatientApp seq={collectedCount} config={config} onSubmit={push} />
        </div>

        {/* 오른쪽 칼럼 */}
        <PlatformInbox subs={subs} onNext={onNext} />
      </div>
    </div>
  );
}
