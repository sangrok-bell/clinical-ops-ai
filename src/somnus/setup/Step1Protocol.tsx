// ① Protocol/SOP review (spec/08).
// Upload a Draft → AI streams operational-risk / contradiction / clinical-fit findings →
// the HUMAN dispositions each (채택/기각/반박 + AI 재검토) → when unresolved hits 0,
// confirm the v1.0 approved version and hand off to ②. AI advises; the human decides.
// Documents are never edited by dispositions — they change exactly once, at finalize.

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
  FileText,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  GitBranch,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  analyzeProtocolStream,
  reevaluateFinding,
  type AnalyzeResult,
  type ProtocolFinding,
  type DocInput,
  type Reverdict,
  type Severity,
  type DocAssessment,
} from "@/somnus/engine/protocol";
import { type StudyHandoff } from "@/somnus/engine/design";

// ── local constants / enums / meta tables ──────────────────────────────────

type DocRole = "protocol" | "sop";
const DOC_META: { role: DocRole; label: string; hint: string }[] = [
  { role: "protocol", label: "임상시험 프로토콜", hint: "평가변수 · 방문 일정 · 타당범위" },
  { role: "sop", label: "데이터 관리 SOP", hint: "ePRO 작성 규정 · 검증 규칙" },
];

// Disposition = the human's recorded judgement. It never edits the document; it
// only appends a decision. The document changes once, at finalize (Draft → v1.0).
type DispStatus = "open" | "contested" | "deferred" | "accepted" | "dismissed" | "escalated";
type Disp = { status: DispStatus; note?: string; ai?: Reverdict };

const sevMeta: Record<Severity, { label: string; dot: string; text: string; rank: number }> = {
  critical: { label: "Critical", dot: "bg-danger", text: "text-danger", rank: 0 },
  warning: { label: "주의", dot: "bg-warning", text: "text-warning", rank: 1 },
  info: { label: "참고", dot: "bg-brand", text: "text-brand", rank: 2 },
};

// resolved=true → a signed disposition exists → passes the gate + collapses to one line.
// resolved=false → blocks the gate (undecided, or an unresolved contest/defer).
const statusMeta: Record<DispStatus, { label: string; cls: string; bar: string; resolved: boolean }> = {
  open: { label: "미검토", cls: "text-dim", bar: "bg-[#dddde4]", resolved: false },
  contested: { label: "쟁점 · AI 이견", cls: "text-warning", bar: "bg-warning", resolved: false },
  deferred: { label: "보류", cls: "text-warning", bar: "bg-warning", resolved: false },
  accepted: { label: "수정안 채택", cls: "text-[#4d6a0f]", bar: "bg-positive", resolved: true },
  dismissed: { label: "기각됨", cls: "text-icon", bar: "bg-[#d4d4dc]", resolved: true },
  escalated: { label: "검토 안건", cls: "text-info", bar: "bg-info", resolved: true },
};

const COMMITTEES = ["스터디팀", "스폰서·Medical Monitor", "IRB·IEC"];

const sevChips: { key: "all" | Severity; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "critical", label: "Critical" },
  { key: "warning", label: "주의" },
  { key: "info", label: "참고" },
];
const statusChips: { key: "all" | "unresolved" | "resolved"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "unresolved", label: "미해결" },
  { key: "resolved", label: "처분됨" },
];

type ConsoleLine = { kind: "status"; text: string } | { kind: "finding"; finding: ProtocolFinding };

// ── component ───────────────────────────────────────────────────────────────

export function Step1Protocol({ onComplete }: { onComplete: (h: StudyHandoff) => void }) {
  const [docs, setDocs] = useState<Partial<Record<DocRole, DocInput>>>({});
  const [stage, setStage] = useState<"intake" | "analyzing" | "review" | "finalize">("intake");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [disp, setDisp] = useState<Record<string, Disp>>({});
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [liveSummary, setLiveSummary] = useState("");
  const [filterSev, setFilterSev] = useState<"all" | Severity>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unresolved" | "resolved">("all");
  const [logOpen, setLogOpen] = useState(false);
  const [docAck, setDocAck] = useState(false);

  // derived
  const hasDoc = !!(docs.protocol || docs.sop);
  const findings = result?.findings ?? [];
  const docFlag = result?.doc_assessment && !result.doc_assessment.is_target ? result.doc_assessment : null;
  const statusOf = (f: ProtocolFinding) => disp[f.id]?.status ?? "open";
  const sevCount = (s: Severity) => findings.filter((f) => f.severity === s).length;
  const stCount = (s: DispStatus) => findings.filter((f) => statusOf(f) === s).length;
  const unresolved = findings.filter((f) => !statusMeta[statusOf(f)].resolved).length;
  // GATE: review stage, at least one finding, and nothing unresolved.
  const gateOpen = stage === "review" && findings.length > 0 && unresolved === 0;
  const docChips = DOC_META.map((d) => docs[d.role]).filter(Boolean) as DocInput[];
  const accepted = findings.filter((f) => statusOf(f) === "accepted");
  const dismissed = findings.filter((f) => statusOf(f) === "dismissed");
  const escalated = findings.filter((f) => statusOf(f) === "escalated");

  const visible = findings
    .filter((f) => filterSev === "all" || f.severity === filterSev)
    .filter((f) => {
      const resolved = statusMeta[statusOf(f)].resolved;
      if (filterStatus === "unresolved") return !resolved;
      if (filterStatus === "resolved") return resolved;
      return true;
    })
    .sort((a, b) => {
      const ra = statusMeta[statusOf(a)].resolved ? 1 : 0;
      const rb = statusMeta[statusOf(b)].resolved ? 1 : 0;
      if (ra !== rb) return ra - rb;
      return sevMeta[a.severity].rank - sevMeta[b.severity].rank;
    });

  // ── handlers ──────────────────────────────────────────────────────────────

  const readFile = (file: File, role: DocRole): Promise<DocInput> =>
    new Promise((resolve, reject) => {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      if (isPdf) {
        reader.onload = () => {
          const url = String(reader.result);
          const b64 = url.slice(url.indexOf(",") + 1);
          resolve({ role, name: file.name, kind: "pdf", data: b64, mediaType: "application/pdf" });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => resolve({ role, name: file.name, kind: "text", text: String(reader.result) });
        reader.readAsText(file);
      }
    });

  const pick = (role: DocRole) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const doc = await readFile(file, role);
    setDocs((prev) => ({ ...prev, [role]: doc }));
  };

  const runAnalysis = async () => {
    setStage("analyzing");
    setLines([]);
    setLiveSummary("");
    setResult(null);
    setDisp({});
    setDocAck(false);
    const arr = [docs.protocol, docs.sop].filter(Boolean) as DocInput[];
    const res = await analyzeProtocolStream(arr, (ev) => {
      if (ev.t === "status") setLines((l) => [...l, { kind: "status", text: ev.text }]);
      else if (ev.t === "summary") setLiveSummary((s) => s + ev.text);
      else if (ev.t === "finding") setLines((l) => [...l, { kind: "finding", finding: ev.finding }]);
      // error / done handled inside the engine — ignored here.
    });
    setResult(res);
    setDisp(Object.fromEntries(res.findings.map((f) => [f.id, { status: "open" as DispStatus }])));
    setStage("review");
  };

  const set = (id: string, d: Disp) => setDisp((prev) => ({ ...prev, [id]: d }));

  const reeval = async (f: ProtocolFinding, reason: string) => {
    const v = await reevaluateFinding(f, reason);
    if (v.verdict === "withdrawn") set(f.id, { status: "dismissed", note: `AI 재검토 철회: ${reason}`, ai: v });
    else set(f.id, { status: "contested", note: reason, ai: v });
  };

  // ── intake / analyzing ──────────────────────────────────────────────────────

  if (stage === "intake" || stage === "analyzing") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">Study Setup · 스터디 설계</p>
          <h1 className="text-[32px] font-bold leading-tight text-ink" style={{ fontFamily: "var(--font-display)" }}>
            프로토콜·SOP 검토
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-dim">
            검토본을 올리면 AI가 운영 위험·모순·임상 부적합 사유를 점검합니다. 각 항목을 <b className="text-ink">채택</b>·<b className="text-ink">기각</b>·
            <b className="text-ink">반박</b>으로 처분해 모두 해소되면 승인본(v1.0)으로 확정해 다음 단계로 넘어갑니다. 판단은 항상 사람이 합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {DOC_META.map((d) => {
            const doc = docs[d.role];
            return (
              <label
                key={d.role}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-3 rounded-2xl border p-5 transition-colors focus-within:ring-2 focus-within:ring-brand",
                  doc ? "border-brand bg-elevated" : "border-dashed border-[#c4c4cc] hover:border-brand hover:bg-elevated/40",
                )}
              >
                <input type="file" accept=".pdf,.txt,.md,.markdown,text/plain" className="sr-only" onChange={pick(d.role)} />
                <span className={cn("flex size-10 items-center justify-center rounded-xl", doc ? "bg-brand text-white" : "bg-elevated text-icon")}>
                  {doc ? <Check className="size-5" /> : <Upload className="size-5" />}
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{d.label}</span>
                  <span className="block truncate text-xs text-dim">{doc ? doc.name : "클릭해서 업로드 (PDF · TXT · MD)"}</span>
                </span>
                <span className="text-xs text-dim">{d.hint}</span>
              </label>
            );
          })}
        </div>

        {stage === "intake" && (
          <div className="flex items-center gap-3">
            <Button variant="navy" disabled={!hasDoc} onClick={runAnalysis}>
              운영 위험 분석
            </Button>
            {!hasDoc && <span className="text-sm text-dim">문서를 1개 이상 올려주세요</span>}
          </div>
        )}

        {stage === "analyzing" && <AnalysisConsole lines={lines} summary={liveSummary} />}
      </div>
    );
  }

  // ── finalize ──────────────────────────────────────────────────────────────

  if (stage === "finalize") {
    return (
      <div className="mx-auto flex max-w-3xl animate-[fadeIn_320ms_ease-out] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">Finalize · 승인본 확정</p>
          <h1 className="text-[28px] font-bold leading-tight text-ink" style={{ fontFamily: "var(--font-display)" }}>
            프로토콜·SOP 승인본 확정
            <span className="ml-3 align-middle text-base font-medium text-dim">
              검토본(Draft) → <span className="text-[#4d6a0f]">v1.0</span>
            </span>
          </h1>
          <p className="text-[15px] leading-relaxed text-dim">
            검토 의견을 반영해 승인본 v1.0을 확정합니다. 문서를 직접 덮어쓰지 않고, 채택·기각·안건을 §출처와 함께 기록합니다.
          </p>
        </div>

        {/* accepted card (always) */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface">
          <div className="border-b border-[#eeeef4] px-5 py-3 text-sm font-semibold text-[#4d6a0f]">
            채택한 수정안 · {accepted.length}건 → v1.0 반영
          </div>
          <div className="divide-y divide-[#f1f1f5]">
            {accepted.length === 0 ? (
              <div className="px-5 py-4 text-sm text-dim">채택한 수정안이 없습니다.</div>
            ) : (
              accepted.map((f) => (
                <div key={f.id} className="px-5 py-3">
                  <p className="text-sm font-semibold text-ink">
                    {f.title}
                    {f.source && <span className="text-[11px] font-normal text-icon"> · {f.source}</span>}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-dim">{f.suggested_fix}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* dismissed card */}
        {dismissed.length > 0 && (
          <div className="rounded-2xl border border-[#eeeef4] bg-surface">
            <div className="border-b border-[#eeeef4] px-5 py-3 text-sm font-semibold text-ink">기각 · {dismissed.length}건 (변경 없음, 사유 기록)</div>
            <div className="divide-y divide-[#f1f1f5]">
              {dismissed.map((f) => (
                <div key={f.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-ink">{f.title}</p>
                  <p className="mt-0.5 text-xs text-dim">사유: {disp[f.id]?.note || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* escalated card */}
        {escalated.length > 0 && (
          <div className="rounded-2xl border border-[#eeeef4] bg-surface">
            <div className="border-b border-[#eeeef4] px-5 py-3 text-sm font-semibold text-info">
              검토 안건 · {escalated.length}건 (위원회 결정 필요 · 미결 추적)
            </div>
            <div className="divide-y divide-[#f1f1f5]">
              {escalated.map((f) => (
                <EscalatedItem key={f.id} f={f} note={disp[f.id]?.note} />
              ))}
            </div>
            <div className="border-t border-[#f1f1f5] px-5 py-3 text-[11px] leading-relaxed text-dim">
              미결 결정 안건은 <b className="text-ink">⑤ 리뷰·감사추적</b>에서 담당자·기한과 함께 추적됩니다. v1.0은 막지 않고 진행하며, 위원회 결정 시 →{" "}
              <b className="text-ink">변경 불요</b>면 종결(사유 기록), <b className="text-ink">변경 필요</b>면 정식 <b className="text-ink">amendment(v1.0→v1.1)</b>로 이어집니다.
            </div>
          </div>
        )}

        {/* audit trail notice */}
        <div className="flex items-start gap-2 rounded-xl bg-elevated p-3 text-xs leading-relaxed text-dim">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
          <span>
            이 확정은 <b className="text-ink">감사추적</b>에 기록됩니다 — 발행 데이터매니저 · 승인 PI · 버전 v1.0 승인본 · 사유 · 시각이 함께 보존됩니다.
          </span>
        </div>

        {/* doc-type ack block */}
        {docFlag && (
          <div className="flex flex-col gap-2 rounded-2xl border border-warning/40 bg-[#fef6e7] p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold text-ink">문서 종류 확인 필요</p>
                <p className="mt-0.5 text-xs leading-relaxed text-dim">
                  AI가 이 문서를 임상 프로토콜·SOP로 보지 않습니다{docFlag.doc_kind ? ` (${docFlag.doc_kind}로 추정)` : ""}. {docFlag.reason}
                </p>
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-2 pl-7">
              <input type="checkbox" checked={docAck} onChange={(e) => setDocAck(e.target.checked)} className="mt-0.5 size-4 accent-[#08264A]" />
              <span className="text-xs leading-relaxed text-ink">검토했고, 이 문서로 진행합니다. (이 결정은 감사추적에 기록됩니다)</span>
            </label>
          </div>
        )}

        {/* CTA row */}
        <div className="flex items-center gap-3">
          <Button
            variant="brand"
            disabled={!!docFlag && !docAck}
            onClick={() =>
              onComplete({
                docs: [docs.protocol, docs.sop].filter(Boolean) as DocInput[],
                summary: result?.summary,
                docAssessment: result?.doc_assessment,
              })
            }
          >
            승인본 v1.0 확정 → ② EDC·ePRO 설계
          </Button>
          <Button variant="ghost" onClick={() => setStage("review")}>
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // ── review ──────────────────────────────────────────────────────────────────

  return (
    <div className="grid animate-[fadeIn_320ms_ease-out] grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* left ledger */}
      <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-6">
        {/* (a) review documents */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-dim">검토 대상 문서</p>
          {docChips.length === 0 ? (
            <p className="text-sm text-dim">업로드 문서</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {docChips.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 shrink-0 text-icon" />
                  <span className="truncate text-ink">{d.name}</span>
                  <span className="ml-auto shrink-0 rounded-pill bg-elevated px-2 py-0.5 text-[10px] text-dim">Draft</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* (b) disposition status */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-dim">처분 현황</p>
            <span className="text-xs text-dim">{findings.length}건</span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className={cn("text-3xl font-bold tabular-nums", unresolved === 0 ? "text-[#4d6a0f]" : "text-ink")}>{unresolved}</span>
            <span className="pb-1 text-sm text-dim">미해결</span>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <CountRow label="미검토" value={stCount("open")} tone={stCount("open") > 0 ? "text-ink" : "text-icon"} />
            <CountRow
              label="쟁점 · 보류"
              value={stCount("contested") + stCount("deferred")}
              tone={stCount("contested") + stCount("deferred") > 0 ? "text-warning" : "text-icon"}
            />
            <div className="my-1 h-px bg-[#f1f1f5]" />
            <CountRow label="수정안 채택" value={stCount("accepted")} tone="text-[#4d6a0f]" />
            <CountRow label="기각" value={stCount("dismissed")} tone="text-icon" />
            <CountRow label="검토 안건" value={stCount("escalated")} tone="text-info" />
          </div>
          <div className="mt-3 border-t border-[#f1f1f5] pt-3 text-[11px] text-icon">
            Critical {sevCount("critical")} · 주의 {sevCount("warning")} · 참고 {sevCount("info")}
          </div>
        </div>

        {/* (c) gate */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
          {gateOpen ? (
            <div className="flex animate-toast-in flex-col gap-2">
              <p className="text-sm font-semibold text-[#4d6a0f]">모든 항목 처분 완료</p>
              <p className="text-xs leading-relaxed text-dim">
                채택 {accepted.length} · 기각 {dismissed.length} · 안건 {escalated.length}건을 승인본(v1.0)으로 확정할 수 있습니다.
              </p>
              <Button variant="brand" className="mt-1 w-full" onClick={() => setStage("finalize")}>
                승인본 v1.0 확정 →
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-ink">게이트 잠김</p>
              <p className="text-xs leading-relaxed text-dim">
                미해결 {unresolved}건(미검토 {stCount("open")} · 쟁점 {stCount("contested")} · 보류 {stCount("deferred")})을 모두 처분해야 다음 단계가 열립니다.
              </p>
            </div>
          )}
        </div>

        {/* (d) AI review log toggle */}
        <div>
          <button onClick={() => setLogOpen((o) => !o)} className="flex items-center gap-1.5 px-1 text-xs text-dim hover:text-ink">
            {logOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            AI 검토 로그
          </button>
          {logOpen && (
            <div className="mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[#eeeef4] bg-surface p-3 font-mono text-[11px] leading-relaxed">
              {lines.map((l, i) => (
                <ConsoleRow key={i} line={l} />
              ))}
              {liveSummary && (
                <p className="whitespace-pre-wrap pt-1 text-dim">
                  <span className="text-icon">summary&gt; </span>
                  {liveSummary}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* right findings */}
      <div className="flex min-w-0 flex-col gap-4">
        {docFlag && <DocTypeBanner a={docFlag} onReupload={() => setStage("intake")} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
              분석 결과 · {findings.length}건
            </h1>
            <p className="mt-0.5 line-clamp-2 max-w-2xl text-xs leading-relaxed text-dim">
              {result?.summary}
              {result?.source === "seed" && " · (기준 점검 항목)"}
            </p>
          </div>
          <Button variant="surface" size="sm" onClick={runAnalysis}>
            <RotateCcw className="size-4" />
            재분석
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sevChips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilterSev(c.key)}
              className={cn(
                "rounded-pill border px-3 py-1 text-xs transition-colors",
                filterSev === c.key ? "border-brand bg-brand text-white" : "border-[#eeeef4] text-dim hover:bg-elevated",
              )}
            >
              {c.label}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-[#eeeef4]" />
          {statusChips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilterStatus(c.key)}
              className={cn(
                "rounded-pill border px-3 py-1 text-xs transition-colors",
                filterStatus === c.key ? "border-brand bg-brand text-white" : "border-[#eeeef4] text-dim hover:bg-elevated",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {visible.map((f, i) => (
          <FindingCard
            key={f.id}
            f={f}
            disp={disp[f.id] ?? { status: "open" }}
            onAccept={() => set(f.id, { status: "accepted" })}
            onDismiss={(r) => set(f.id, { status: "dismissed", note: r })}
            onReeval={(r) => reeval(f, r)}
            onDefer={() => set(f.id, { status: "deferred" })}
            onEscalate={(r) => set(f.id, { status: "escalated", note: r })}
            onReset={() => set(f.id, { status: "open" })}
            delayMs={Math.min(i, 8) * 40}
          />
        ))}

        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#eeeef4] py-10 text-center text-sm text-dim">필터에 해당하는 항목이 없습니다.</div>
        )}
      </div>
    </div>
  );
}

// ── CountRow ──────────────────────────────────────────────────────────────────

function CountRow({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-dim">{label}</span>
      <span className={cn("font-semibold tabular-nums", tone || "text-ink")}>{value}</span>
    </div>
  );
}

// ── AnalysisConsole ────────────────────────────────────────────────────────────

function AnalysisConsole({ lines, summary }: { lines: ConsoleLine[]; summary: string }) {
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, summary]);

  const found = lines.filter((l) => l.kind === "finding").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#eeeef4] bg-surface">
      <div className="flex items-center gap-2 border-b border-[#eeeef4] bg-canvas px-4 py-2.5">
        <Loader2 className="size-4 animate-spin text-brand" />
        <span className="text-sm font-semibold text-ink">AI 검토 엔진</span>
        <span className="rounded-pill bg-elevated px-2 py-0.5 text-[10px] text-dim">실시간 분석</span>
        {found > 0 && <span className="text-xs text-dim">· {found}건 발견</span>}
        <span className="ml-auto font-mono text-xs tabular-nums text-dim">{elapsed}s</span>
      </div>
      <div ref={scrollRef} className="max-h-72 space-y-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed">
        {lines.map((l, i) => (
          <ConsoleRow key={i} line={l} />
        ))}
        {summary && (
          <p className="whitespace-pre-wrap pt-1 text-ink">
            <span className="text-icon">summary&gt; </span>
            {summary}
          </p>
        )}
        <p className="flex items-center gap-1.5 pt-0.5 text-dim">
          <span className="text-positive">▸</span>
          <span className="inline-block h-3.5 w-1.5 animate-pulse rounded-[1px] bg-brand/80" />
        </p>
      </div>
    </div>
  );
}

// ── ConsoleRow ──────────────────────────────────────────────────────────────────

function ConsoleRow({ line }: { line: ConsoleLine }) {
  if (line.kind === "status") {
    return (
      <p className="text-dim">
        <span className="text-icon">· </span>
        {line.text}
      </p>
    );
  }
  const f = line.finding;
  const m = sevMeta[f.severity];
  return (
    <p className="animate-[fadeIn_240ms_ease-out] text-ink">
      <span className={cn("mr-1.5", m.text)}>●</span>
      <span className={cn("font-semibold", m.text)}>[{m.label}]</span> {f.title}
      {f.source && <span className="text-icon"> · {f.source}</span>}
    </p>
  );
}

// ── DocTypeBanner ──────────────────────────────────────────────────────────────

function DocTypeBanner({ a, onReupload }: { a: DocAssessment; onReupload?: () => void }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-warning/40 bg-[#fef6e7] p-4">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          이 문서는 임상 프로토콜·SOP로 보이지 않습니다{a.doc_kind ? ` (${a.doc_kind}로 추정)` : ""}
        </p>
        {a.reason && <p className="mt-0.5 text-xs leading-relaxed text-dim">{a.reason}</p>}
        <p className="mt-1 text-[11px] text-icon">
          AI의 신호일 뿐, 진행 여부는 사람이 정합니다 — 잘못 올리셨다면 다시 업로드하고, 그대로 검토하려면 확정 단계에서 확인하세요.
        </p>
        {onReupload && (
          <button
            onClick={onReupload}
            className="mt-2 inline-flex items-center gap-1 rounded-pill border border-[#dddde4] bg-surface px-3 py-1 text-xs font-medium text-ink hover:bg-elevated focus-visible:ring-2 focus-visible:ring-brand"
          >
            <RotateCcw className="size-3" />
            다른 문서 올리기
          </button>
        )}
      </div>
    </div>
  );
}

// ── FindingCard ──────────────────────────────────────────────────────────────

function FindingCard({
  f,
  disp,
  onAccept,
  onDismiss,
  onReeval,
  onDefer,
  onEscalate,
  onReset,
  delayMs,
}: {
  f: ProtocolFinding;
  disp: Disp;
  onAccept: () => void;
  onDismiss: (reason: string) => void;
  onReeval: (reason: string) => Promise<void>;
  onDefer: () => void;
  onEscalate: (reason: string) => void;
  onReset: () => void;
  delayMs: number;
}) {
  const [mode, setMode] = useState<"idle" | "dispute">("idle");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const m = sevMeta[f.severity];
  const st = statusMeta[disp.status];

  const cardCls = "relative overflow-hidden rounded-2xl border border-[#eeeef4] bg-surface pl-5 [animation-fill-mode:both] animate-[fadeIn_260ms_ease-out]";
  const bar = <span className={cn("absolute inset-y-0 left-0 w-1", st.bar)} />;

  // resolved → one-line collapse
  if (st.resolved) {
    return (
      <div className={cn(cardCls, "flex items-center gap-2 py-3 pr-4")} style={{ animationDelay: `${delayMs}ms` }}>
        {bar}
        <span className={cn("size-1.5 shrink-0 rounded-full", m.dot)} />
        <span className="truncate text-sm font-medium text-ink">{f.title}</span>
        <span className="ml-auto flex shrink-0 items-center gap-3">
          <StatusChip status={disp.status} />
          <button onClick={onReset} className="text-xs text-dim underline underline-offset-2 hover:text-ink">
            되돌리기
          </button>
        </span>
      </div>
    );
  }

  // unresolved → full card
  return (
    <div className={cn(cardCls, "p-5")} style={{ animationDelay: `${delayMs}ms` }}>
      {bar}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("size-2 rounded-full", m.dot)} />
        <span className={cn("text-xs font-semibold uppercase tracking-wide", m.text)}>{m.label}</span>
        <span className="text-[15px] font-semibold text-ink">{f.title}</span>
        {f.category && <span className="rounded-pill bg-elevated px-2 py-0.5 text-[10px] text-dim">{f.category}</span>}
        <span className="ml-auto">
          <StatusChip status={disp.status} />
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-dim">{f.detail}</p>
      {f.source && <p className="mt-1 text-[11px] text-icon">출처: {f.source}</p>}

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-elevated p-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
        <p className="text-xs leading-relaxed text-dim">
          <span className="font-semibold text-ink">제안 수정안 </span>
          {f.suggested_fix}
        </p>
      </div>

      {disp.ai && (
        <div className="mt-2 rounded-xl border border-[#eeeef4] p-3 text-xs leading-relaxed">
          <span className="font-semibold text-ink">AI 재검토: </span>
          {disp.ai.verdict === "withdrawn" ? (
            <span className="font-semibold text-[#4d6a0f]">철회</span>
          ) : (
            <span className="font-semibold text-warning">유지</span>
          )}
          <span className="text-dim"> — {disp.ai.explanation}</span>
        </div>
      )}

      {/* action area — 3 branches */}
      <div className="mt-3">
        {mode === "dispute" ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="이 지적이 왜 맞지 않나요? 근거를 적어주세요. (감사추적에 기록됩니다)"
              className="w-full rounded-xl border border-[#dddde4] bg-canvas p-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="surface" disabled={busy || !reason.trim()} onClick={() => onDismiss(reason)}>
                내 판단으로 기각
              </Button>
              <Button
                size="sm"
                variant="navy"
                disabled={busy || !reason.trim()}
                onClick={async () => {
                  setBusy(true);
                  await onReeval(reason);
                  setBusy(false);
                  setMode("idle");
                }}
              >
                {busy ? "AI 재검토 중…" : "AI 재검토 요청"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
                취소
              </Button>
            </div>
          </div>
        ) : disp.status === "contested" ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-dim">AI와 의견이 갈립니다. 사람이 최종 처분하세요 — 합의는 필수가 아닙니다.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="navy" onClick={onAccept}>
                수정안 채택
              </Button>
              <Button size="sm" variant="surface" onClick={() => onDismiss(disp.note || "사람 판단으로 기각")}>
                기각 유지
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEscalate(disp.note || "")}>
                <GitBranch className="size-3.5" />
                검토 안건 상정
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReason(disp.note || "");
                  setMode("dispute");
                }}
              >
                다시 반박
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="navy" onClick={onAccept}>
              수정안 채택
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode("dispute")}>
              반박
            </Button>
            {disp.status === "deferred" ? (
              <Button size="sm" variant="ghost" onClick={onReset}>
                보류 해제
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={onDefer}>
                보류
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── StatusChip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: DispStatus }) {
  return (
    <span className={cn("text-xs font-medium", statusMeta[status].cls)}>
      {statusMeta[status].label}
      {status === "accepted" && <span className="text-dim"> · 반영 대기</span>}
    </span>
  );
}

// ── EscalatedItem ──────────────────────────────────────────────────────────────

function EscalatedItem({ f, note }: { f: ProtocolFinding; note?: string }) {
  const [owner, setOwner] = useState(COMMITTEES[0]);
  return (
    <div className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <GitBranch className="size-4 shrink-0 text-info" />
        <span className="text-sm font-medium text-ink">{f.title}</span>
        {f.source && <span className="text-[11px] text-icon">· {f.source}</span>}
      </div>
      {note && <p className="mt-1 pl-6 text-xs text-dim">안건 사유: {note}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
        <span className="text-[11px] text-icon">위원회 라우팅 →</span>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="rounded-pill border border-[#dddde4] bg-canvas px-2 py-0.5 text-[11px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {COMMITTEES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="rounded-pill bg-elevated px-2 py-0.5 text-[11px] text-dim">기한 D+14</span>
        <span className="rounded-pill bg-[#eef3f9] px-2 py-0.5 text-[11px] font-medium text-info">미결 추적</span>
      </div>
    </div>
  );
}
