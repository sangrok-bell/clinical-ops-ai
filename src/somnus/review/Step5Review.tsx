import { useMemo, useState } from "react";
import { ScanLine, Sparkles, ShieldAlert, ArrowRight, Check, FileSearch, Loader2, Pencil, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { analyzeBulk, findingKey, type Config, type ValFinding, type ValLayer, type Route, type Dataset } from "@/somnus/engine/validate";
import type { Query, Queries } from "@/somnus/setup/SetupShell";

const layerStyle: Record<ValLayer, { text: string; bg: string; name: string }> = {
  L1: { text: "text-brand", bg: "bg-elevated", name: "범위·형식" },
  L2: { text: "text-brand", bg: "bg-elevated", name: "폼내 논리" },
  L3: { text: "text-danger", bg: "bg-[#fdecec]", name: "교차소스 ★" },
  L5: { text: "text-warning", bg: "bg-[#fef6e7]", name: "생리·다변량" },
  L6: { text: "text-dim", bg: "bg-elevated", name: "진정성" },
  safety: { text: "text-danger", bg: "bg-[#fdecec]", name: "안전성" },
};

export const keyOf = findingKey;
const draftFor = (f: ValFinding) => `[${f.subject}] ${f.layer} ${layerStyle[f.layer].name}: ${f.msg} — 원자료 대조 요망`;

async function askExplain(f: ValFinding): Promise<string> {
  try {
    const r = await fetch("/api/explain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ finding: { layer: f.layer, sev: f.severity, field: f.subject, msg: f.msg } }) });
    if (!r.ok) throw new Error();
    return (await r.json()).explanation || f.msg;
  } catch {
    return `${f.layer} 계층 · ${f.msg} — 원자료와 대조해 처리하세요.`;
  }
}

function QueryText({ query, onUpdate, onRemove }: { query: Query; onUpdate: (text: string) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(query.text);
  const resolved = query.status === "resolved";
  return (
    <div className="mt-2 rounded-lg border border-[#eeeef4] bg-canvas p-2">
      <div className="flex items-center gap-1.5">
        <FileSearch className="size-3 text-brand" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-dim">발행 쿼리{query.origin === "manual" && " · 수동"}</span>
        <span className={cn("ml-auto inline-flex items-center gap-1 text-[10px] font-medium", resolved ? "text-[#4d6a0f]" : "text-warning")}>
          {resolved ? <><Check className="size-3" /> 종결됨</> : "발행됨"}
        </span>
        {!resolved && <button onClick={() => { setDraft(query.text); setEditing((e) => !e); }} title="쿼리 수정" className="text-icon hover:text-brand"><Pencil className="size-3" /></button>}
        {!resolved && <button onClick={onRemove} title="쿼리 삭제" aria-label="쿼리 삭제" className="text-icon hover:text-danger"><Trash2 className="size-3" /></button>}
      </div>
      {editing ? (
        <textarea autoFocus rows={2} value={draft} onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { onUpdate(draft.trim() || query.text); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onUpdate(draft.trim() || query.text); setEditing(false); } }}
          className="mt-1 w-full rounded-md border border-brand bg-surface px-2 py-1 text-[12px] leading-relaxed text-ink outline-none" />
      ) : (
        <p className="mt-1 text-[12px] leading-relaxed text-ink">{query.text}</p>
      )}
      {resolved && query.reason && <p className="mt-1 text-[11px] text-icon">종결 사유: {query.reason}</p>}
    </div>
  );
}

function FindingItem({ f, query, onIssue, onUpdate, onRemove }: { f: ValFinding; query?: Query; onIssue: () => void; onUpdate: (text: string) => void; onRemove: () => void }) {
  const [expl, setExpl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ls = layerStyle[f.layer];
  const blind = f.layer !== "L1" && f.layer !== "L2";
  const ask = async () => { setLoading(true); setExpl(await askExplain(f)); setLoading(false); };
  return (
    <div className="rounded-xl border border-[#eeeef4] bg-surface p-3 [animation-fill-mode:both] animate-[fadeIn_260ms_ease-out]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs font-semibold text-ink">{f.subject}</span>
        <span className={cn("rounded-pill px-1.5 py-0.5 text-[10px] font-medium", ls.bg, ls.text)}>{f.layer} {ls.name}</span>
        {blind && <span className="rounded-pill bg-[#eef3f9] px-1.5 py-0.5 text-[9px] font-medium text-info">EDC 사각지대</span>}
        <span className="text-[10px] text-icon">{f.channel}</span>
        <span className={cn("ml-auto text-[11px] font-semibold", f.tier === "absurd" ? "text-danger" : "text-info")}>{f.verdict}</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink">{f.msg}</p>
      {f.evidence && <p className="mt-0.5 text-[11px] text-icon">근거: {f.evidence}</p>}
      {expl && <p className="mt-2 rounded-md bg-elevated p-2 text-[11px] leading-relaxed text-ink"><span className="font-semibold text-brand">AI 검토 </span>{expl}</p>}
      {query && <QueryText query={query} onUpdate={onUpdate} onRemove={onRemove} />}
      <div className="mt-2 flex items-center gap-2">
        <button onClick={ask} disabled={loading || !!expl} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline disabled:text-icon disabled:no-underline">
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}{expl ? "설명됨" : "AI 설명"}
        </button>
        {!query && <Button size="sm" variant="outline" className="ml-auto" onClick={onIssue}>쿼리 발행</Button>}
      </div>
    </div>
  );
}

function ManualQueries({ queries, onIssue, onUpdate, onRemove }: { queries: Queries; onIssue: (q: Query) => void; onUpdate: (key: string, patch: Partial<Query>) => void; onRemove: (key: string) => void }) {
  const manual = Object.values(queries).filter((q) => q.origin === "manual");
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const add = () => { if (!text.trim()) return; onIssue({ key: `manual:${Date.now()}`, text: text.trim(), status: "issued", origin: "manual", subject: subject.trim() || undefined }); setSubject(""); setText(""); setOpen(false); };
  return (
    <div className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
      <div className="flex items-center gap-2">
        <Plus className="size-4 text-brand" />
        <span className="text-sm font-semibold text-ink">수동 쿼리</span>
        <span className="text-[11px] text-dim">엔진이 제안하지 않은 쿼리를 직접 추가</span>
        <Button size="sm" variant="surface" className="ml-auto" onClick={() => setOpen((o) => !o)}>{open ? "닫기" : "+ 쿼리 추가"}</Button>
      </div>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="대상자 ID (선택, 예: S-02)" className="rounded-lg border border-[#dddde4] bg-canvas px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand" />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="쿼리 내용 (예: V3 PSG 측정일이 방문창을 벗어남 — 사이트 확인 요망)" className="rounded-lg border border-[#dddde4] bg-canvas px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand" />
          <Button size="sm" variant="navy" className="self-start" disabled={!text.trim()} onClick={add}>발행</Button>
        </div>
      )}
      {manual.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {manual.map((q) => <QueryText key={q.key} query={q} onUpdate={(t) => onUpdate(q.key, { text: t })} onRemove={() => onRemove(q.key)} />)}
        </div>
      )}
    </div>
  );
}

const QUEUES: { route: Route; title: string; sub: string; icon: typeof ScanLine; tone: string }[] = [
  { route: "안전_에스컬레이션", title: "안전 에스컬레이션", sub: "PI·메디컬모니터 · 억제·강등 금지", icon: ShieldAlert, tone: "text-danger" },
  { route: "확정쿼리", title: "확정 쿼리 (DM)", sub: "명백한 모순·오입력(absurd)", icon: FileSearch, tone: "text-warning" },
  { route: "검토필요_SDV", title: "검토 필요 (SDV)", sub: "후보·통계 신호(plausible)", icon: ScanLine, tone: "text-info" },
];

export function Step5Review({ dataset, config, liveCount = 0, queries, onIssue, onUpdate, onRemove, onNext }: { dataset: Dataset; config: Config; liveCount: number; queries: Queries; onIssue: (q: Query) => void; onUpdate: (key: string, patch: Partial<Query>) => void; onRemove: (key: string) => void; onNext: () => void }) {
  const [ran, setRan] = useState(false);
  const result = useMemo(() => analyzeBulk(dataset, config), [dataset, config]);
  const s = result.summary;

  const queryable = result.records.filter((r) => r.route !== "통과");
  const issued = queryable.filter((r) => queries[keyOf(r)]).length;
  const blindspot = result.records.filter((r) => r.layer !== "L1" && r.layer !== "L2").length;

  if (!ran) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Header />
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-[#eeeef4] bg-surface p-6">
          <div className="flex items-center gap-2 text-sm text-dim">
            <FileSearch className="size-4 text-brand" />
            <span>코호트 적재됨 — 대상자 {dataset.subjects.length}명 · 설문 {dataset.assessments.length}회차 · 스마트워치 {dataset.watch.length} · AE {dataset.ae.length}{liveCount > 0 && <> · <b className="text-ink">③ 수집 {liveCount}건 포함</b></>}</span>
          </div>
          <Button variant="navy" onClick={() => setRan(true)}><ScanLine className="size-4" /> 대량 검증 실행</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <Header />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { k: "수신 레코드", v: s.records_in, tone: "text-ink" },
          { k: "플래그 대상자", v: s.flagged_subjects, tone: "text-ink" },
          { k: "확정 쿼리", v: s.확정쿼리, tone: "text-warning" },
          { k: "안전 에스컬", v: s.안전_에스컬레이션, tone: "text-danger" },
          { k: "무신호 통과", v: s.silent_pass, tone: "text-[#4d6a0f]" },
        ].map((c) => (
          <div key={c.k} className="rounded-2xl border border-[#eeeef4] bg-surface p-3">
            <p className="text-[11px] text-dim">{c.k}</p>
            <p className={cn("mt-0.5 text-2xl font-bold tabular-nums", c.tone)}>{c.v}</p>
          </div>
        ))}
      </div>
      <p className="-mt-2 text-[11px] text-icon">
        <b className="text-info">표준 EDC 사각지대 {blindspot}건</b>(L3·L5·L6·안전) 검출 · <b className="text-[#4d6a0f]">무신호 통과 0</b> 보장 — 애매한 건도 조용히 통과하지 않고 검토 큐로 분류됩니다.{liveCount > 0 && <> ③에서 수집된 {liveCount}건 포함.</>}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {QUEUES.map((q) => {
          const items = result.records.filter((r) => r.route === q.route);
          return (
            <div key={q.route} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <q.icon className={cn("size-4", q.tone)} />
                <span className="text-sm font-semibold text-ink">{q.title}</span>
                <span className="ml-auto text-xs text-dim">{items.length}</span>
              </div>
              <p className="-mt-1 text-[11px] text-icon">{q.sub}</p>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#eeeef4] px-3 py-4 text-center text-[11px] text-icon">
                  {q.route === "검토필요_SDV" ? "이번 회차에는 추가 검토가 필요한 통계·교차 신호가 없습니다." : "해당 없음"}
                </p>
              ) : (
                items.map((f) => <FindingItem key={keyOf(f)} f={f} query={queries[keyOf(f)]} onIssue={() => onIssue({ key: keyOf(f), text: draftFor(f), status: "issued", origin: "auto", subject: f.subject, ec: f.layer })} onUpdate={(t) => onUpdate(keyOf(f), { text: t })} onRemove={() => onRemove(keyOf(f))} />)
              )}
            </div>
          );
        })}
      </div>

      <ManualQueries queries={queries} onIssue={onIssue} onUpdate={onUpdate} onRemove={onRemove} />

      <div className="flex items-start gap-2 rounded-2xl bg-elevated p-3 text-[11px] leading-relaxed text-dim">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>엔진은 쿼리를 <b className="text-ink">제안</b>할 뿐 — 사람이 문구를 <b className="text-ink">수정·삭제·추가</b>하고, ⑥에서 <b className="text-ink">사유와 함께 종결</b>합니다. 숫자·발화는 결정적 규칙, 처분은 사람.</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#eeeef4] bg-surface p-4">
        <p className="text-sm text-dim">엔진 제안 발행 <b className="text-ink">{issued}/{queryable.length}</b> · 발행된 쿼리는 ⑥에서 사유와 함께 종결돼야 Lock 가능</p>
        <Button variant="brand" className="ml-auto" disabled={!onNext} onClick={onNext}>다음: ⑥ DB Lock <ArrowRight className="size-4" /></Button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">Data Review · 데이터 리뷰·쿼리</p>
      <h1 className="text-[32px] font-bold leading-tight text-ink" style={{ fontFamily: "var(--font-display)" }}>대량 검증 · 쿼리 발행</h1>
      <p className="max-w-2xl text-[15px] leading-relaxed text-dim">
        누적 수집된 데이터 전체를 <b className="text-ink">검증 엔진(analyze_bulk)</b>으로 점검합니다. 입력 시점에 못 잡는
        <b className="text-ink"> 소스간 교차검증·진정성·안전성(L3·L5·L6·안전)</b>이 여기서 작동하고, 결과는 라우팅 큐로 분류돼 쿼리로 처리됩니다. 숫자는 결정적 규칙, AI는 설명만.
      </p>
    </div>
  );
}
