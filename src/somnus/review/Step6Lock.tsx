import { useMemo, useState } from "react";
import { Lock, Check, ShieldCheck, ShieldAlert, RotateCcw, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { analyzeBulk, findingKey, type Config, type ValFinding, type Dataset } from "@/somnus/engine/validate";
import type { Queries } from "@/somnus/setup/SetupShell";

const keyOf = findingKey;

export function Step6Lock({ dataset, config, queries, onResolve, onRestart }: { dataset: Dataset; config: Config; queries: Queries; onResolve: (key: string, reason: string) => void; onRestart: () => void }) {
  const result = useMemo(() => analyzeBulk(dataset, config), [dataset, config]);
  const [locked, setLocked] = useState(false);
  // Every closure records a reason (audit trail); safety closures additionally
  // require explicit PI/Medical-Monitor disposition. The DM cannot bulk-close safety.
  const [reason, setReason] = useState<Record<string, string>>({});

  const queryable = result.records.filter((r) => r.route !== "통과");
  const confirmable = queryable.filter((r) => r.route === "확정쿼리");
  const sdv = queryable.filter((r) => r.route === "검토필요_SDV");
  const safety = queryable.filter((r) => r.route === "안전_에스컬레이션");
  const isResolved = (f: ValFinding) => queries[keyOf(f)]?.status === "resolved";
  const openItems = queryable.filter((f) => !isResolved(f));
  const openData = openItems.filter((f) => f.route !== "안전_에스컬레이션");
  const openSafety = openItems.filter((f) => f.route === "안전_에스컬레이션");

  const checks = [
    { label: "확정 쿼리 종결", ok: confirmable.every(isResolved), detail: `${confirmable.filter(isResolved).length}/${confirmable.length}` },
    { label: "검토 필요(SDV) 종결", ok: sdv.every(isResolved), detail: `${sdv.filter(isResolved).length}/${sdv.length}` },
    { label: "안전 에스컬레이션 종결 (PI·메디컬모니터)", ok: safety.every(isResolved), detail: `${safety.filter(isResolved).length}/${safety.length}` },
    { label: "무신호 통과 0 (불변)", ok: result.summary.silent_pass === 0, detail: "보장됨" },
  ];
  const canLock = checks.every((c) => c.ok);

  if (locked) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 py-10 text-center animate-[fadeIn_320ms_ease-out]">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-brand text-white"><Lock className="size-7" /></span>
        <div>
          <h1 className="text-[28px] font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>DB Lock 완료</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-dim">
            데이터베이스 <b className="text-ink">v1.0</b>이 동결되었습니다 · <b className="text-ink">{result.summary.records_in.toLocaleString()}</b> 레코드 · 미해결 쿼리 0 · 무신호 통과 0. 이제 통계 분석을 시작할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-elevated px-4 py-2.5 text-xs text-dim">
          <ShieldCheck className="size-4 text-brand" />감사추적 — 모든 쿼리 처분과 DB Lock이 주체·역할·사유·버전(v1.0)·시각과 함께 보존됩니다.
        </div>
        {onRestart && <Button variant="surface" size="sm" onClick={onRestart}><RotateCcw className="size-4" /> 새 스터디 시작</Button>}
        <p className="mt-2 max-w-md text-[11px] leading-relaxed text-icon">① 프로토콜 승인 → ② 설계 → ③ 수집 → ④ 감시 → ⑤ 리뷰·쿼리 → ⑥ Lock. 한 결정 엔진이 입력 시점부터 마감까지 데이터 무결성을 추적합니다.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">Database Lock · 데이터 마감</p>
        <h1 className="text-[32px] font-bold leading-tight text-ink" style={{ fontFamily: "var(--font-display)" }}>DB Lock</h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-dim">⑤에서 발행한 쿼리가 모두 <b className="text-ink">종결</b>되고 안전 신호가 <b className="text-ink">PI·메디컬모니터 확인</b>으로 해소돼야 데이터베이스를 동결할 수 있습니다. <b className="text-ink">무신호 통과 0</b> 불변이 "조용히 넘어간 데이터 없음"을 보장합니다.</p>
      </div>

      <div className="rounded-2xl border border-[#eeeef4] bg-surface">
        {checks.map((c, i) => (
          <div key={c.label} className={cn("flex items-center gap-3 px-5 py-3.5", i > 0 && "border-t border-[#f1f1f5]")}>
            <span className={cn("flex size-5 items-center justify-center rounded-full", c.ok ? "bg-positive text-onaccent" : "bg-warning text-white")}>{c.ok ? <Check className="size-3" /> : "!"}</span>
            <span className="text-sm text-ink">{c.label}</span>
            <span className={cn("ml-auto text-xs", c.ok ? "text-dim" : "text-warning")}>{c.detail}</span>
          </div>
        ))}
      </div>

      {openData.length > 0 && (
        <div className="rounded-2xl border border-[#eeeef4] bg-surface">
          <div className="flex items-center gap-2 border-b border-[#eeeef4] px-5 py-3">
            <FileSearch className="size-4 text-warning" />
            <span className="text-sm font-semibold text-ink">미종결 데이터 쿼리 {openData.length}건</span>
            <button onClick={() => openData.forEach((f) => onResolve(keyOf(f), reason[keyOf(f)]?.trim() || "DM 검토 후 원자료와 일치 확인"))} className="ml-auto text-xs font-medium text-brand hover:underline">전체 종결 (사유 자동기록)</button>
          </div>
          <div className="divide-y divide-[#f1f1f5]">
            {openData.map((f) => { const k = keyOf(f); return (
              <div key={k} className="flex flex-col gap-2 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink">{f.subject}</span>
                  <span className="text-[11px] text-dim">{f.layer} · {f.channel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input value={reason[k] ?? ""} onChange={(e) => setReason((s) => ({ ...s, [k]: e.target.value }))} placeholder="종결 사유 (예: 사이트 원자료와 대조해 정정·확인)" className="min-w-0 flex-1 rounded-lg border border-[#dddde4] bg-canvas px-2.5 py-1.5 text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                  <Button size="sm" variant="outline" onClick={() => onResolve(k, reason[k]?.trim() || "DM 검토 후 원자료와 일치 확인")}>종결</Button>
                </div>
              </div>
            ); })}
          </div>
        </div>
      )}

      {openSafety.length > 0 && (
        <div className="rounded-2xl border border-danger/30 bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#eeeef4] px-5 py-3">
            <ShieldAlert className="size-4 text-danger" />
            <span className="text-sm font-semibold text-ink">안전 에스컬레이션 {openSafety.length}건 · 일괄 종결 불가</span>
            <span className="ml-auto rounded-pill bg-[#fdecec] px-2 py-0.5 text-[10px] font-medium text-danger">PI·메디컬모니터 확인 필수</span>
          </div>
          <div className="divide-y divide-[#f1f1f5]">
            {openSafety.map((f) => {
              const k = keyOf(f);
              const r = reason[k] ?? "";
              return (
                <div key={k} className="flex flex-col gap-2 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink">{f.subject}</span>
                    <span className="text-[11px] font-medium text-danger">{f.channel}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-dim">{f.msg}</p>
                  <div className="flex items-center gap-2">
                    <input
                      value={r}
                      onChange={(e) => setReason((s) => ({ ...s, [k]: e.target.value }))}
                      placeholder="PI·메디컬모니터 처분 사유 (예: AE 보고 연계 확인, 추적 완료)"
                      className="min-w-0 flex-1 rounded-lg border border-[#dddde4] bg-canvas px-2.5 py-1.5 text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                    <Button size="sm" variant="navy" disabled={!r.trim()} onClick={() => onResolve(k, r.trim())}>확인 후 종결</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button variant="brand" disabled={!canLock} onClick={() => setLocked(true)}><Lock className="size-4" /> 데이터베이스 v1.0 잠금</Button>
      {!canLock && <p className="-mt-3 text-[11px] text-icon">미종결 쿼리·안전 신호가 남아 Lock이 막혀 있습니다 (무신호 통과 0 불변).</p>}
    </div>
  );
}
