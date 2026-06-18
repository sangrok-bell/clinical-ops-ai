import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  Loader2,
  Check,
  Pencil,
  Database,
  Smartphone,
  ScanLine,
  CalendarDays,
  Trash2,
  Lock,
  RotateCcw,
  SlidersHorizontal,
  Plus,
  X,
  AlertTriangle,
  Watch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  deriveDesign,
  checkFieldScope,
  EPRO_FORM,
  type DesignResult,
  type DesignField,
  type DesignRule,
  type LayerTag,
  type RuleSev,
  type StudyHandoff,
  type ScopeVerdict,
  type ScopeContext,
} from "@/somnus/engine/design";
import type { Config } from "@/somnus/engine/validate";

// ── meta constants ───────────────────────────────────────────────────────────

const sevStyle: Record<RuleSev, { dot: string; text: string }> = {
  crit: { dot: "bg-danger", text: "text-danger" },
  warn: { dot: "bg-warning", text: "text-warning" },
  info: { dot: "bg-brand", text: "text-brand" },
};

const LAYER_META: Record<LayerTag, { name: string; std: boolean }> = {
  L1: { name: "범위·형식", std: true },
  L2: { name: "내적 일관성", std: true },
  L3: { name: "교차소스", std: false },
  L5: { name: "코호트 이상치", std: false },
  L6: { name: "진정성", std: false },
  안전: { name: "안전성", std: false },
};

const LAYER_ORDER: LayerTag[] = ["L1", "L2", "L3", "L5", "L6", "안전"];

type ThreshKey = "ISI_SEVERE" | "WATCH_GOOD_TST" | "PHQ9_HIGH" | "cross_window" | "safety_window" | "var_window";

const THRESHOLDS: { key: ThreshKey; label: string; unit: string; hint: string }[] = [
  { key: "ISI_SEVERE", label: "ISI 중증 기준", unit: "≥점", hint: "L3 교차검증 발동 기준" },
  { key: "WATCH_GOOD_TST", label: "객관 정상수면", unit: "≥분", hint: "스마트워치 '잘 잠' 기준" },
  { key: "PHQ9_HIGH", label: "PHQ-9 고위험", unit: "≥점", hint: "안전성 신호 기준" },
  { key: "cross_window", label: "교차검증 윈도우", unit: "±일", hint: "ISI↔워치 매칭 허용 일수" },
  { key: "safety_window", label: "안전 연계 윈도우", unit: "±일", hint: "AE 후속조치 인정 일수" },
  { key: "var_window", label: "평탄 의심 회차", unit: "회", hint: "연속 무변동 ISI 회차" },
];

// ── sub components ─────────────────────────────────────────────────────────────

function ThresholdField({ label, unit, hint, value, onChange }: { label: string; unit: string; hint: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="rounded-xl border border-[#eeeef4] bg-canvas p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-16 rounded-md border border-[#dddde4] bg-surface px-1.5 py-0.5 text-right text-sm font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <span className="w-7 text-[10px] text-icon">{unit}</span>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-icon">{hint}</p>
    </div>
  );
}

function RuleChip({ r }: { r: DesignRule }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-pill border border-[#eeeef4] px-1.5 py-0.5 text-[10px]", sevStyle[r.sev].text)}>
      <span className={cn("size-1 rounded-full", sevStyle[r.sev].dot)} />
      {r.layer}
    </span>
  );
}

function OriginBadge({ origin, kind }: { origin: "core" | "ai" | "manual"; kind?: "rule" }) {
  if (origin === "core") {
    return (
      <span className="shrink-0 rounded-pill bg-[#eef3f9] px-1.5 py-0.5 text-[9px] font-medium text-info">{kind === "rule" ? "결정적·코드" : "결정적"}</span>
    );
  }
  if (origin === "manual") {
    return <span className="shrink-0 rounded-pill bg-[#f3f7e0] px-1.5 py-0.5 text-[9px] font-medium text-[#4d6a0f]">수동 추가</span>;
  }
  return <span className="shrink-0 rounded-pill bg-elevated px-1.5 py-0.5 text-[9px] font-medium text-dim">AI 도출</span>;
}

const SCOPE_STYLE: Record<ScopeVerdict["verdict"], { cls: string; label: (s: ScopeVerdict) => string }> = {
  in_scope: { cls: "bg-[#f3f7e0] text-[#4d6a0f]", label: (s) => `근거 확인${s.maps_to ? " · " + s.maps_to : ""}` },
  caution: { cls: "bg-[#fef6e7] text-warning", label: () => "근거 약함 — 확인 권장" },
  out_of_scope: { cls: "bg-[#fdecec] text-danger", label: () => "프로토콜·SOP 범위 밖" },
};

function ScopeBadge({ s }: { s: ScopeVerdict }) {
  const m = SCOPE_STYLE[s.verdict];
  return <span className={cn("inline-flex items-center gap-1 rounded-pill px-1.5 py-0.5 text-[9px] font-medium", m.cls)}>{m.label(s)}</span>;
}

// SOP continuous/daily collection (not visit-bound) — the always-on watch + daily ISI ePRO.
const CONTINUOUS = [
  { label: "ISI ePRO (매일)", cadence: "매일", detail: "환자 자가응답 — 제출시각·응답소요 기록", source: "프로토콜 §ePRO / SOP §상시수집", icon: Smartphone },
  { label: "스마트워치 — 상시 생체신호", cadence: "상시(연속)", detail: "심박·SpO₂·활동, ~30분 간격 연속 수집", source: "기기 연동 / SOP §상시수집", icon: Watch },
  { label: "스마트워치 — 일별 수면요약", cadence: "매일", detail: "수면시간·심박·HRV·SpO₂·착용시간", source: "기기 연동 / SOP §상시수집", icon: Watch },
];

// inline "+ 필드 추가" editor with AI scope guard (signal, never blocks — human decides).
function AddFieldForm({ form, ctx, onAdd, onCancel }: { form: string; ctx: ScopeContext; onAdd: (f: DesignField) => void; onCancel: () => void }) {
  const [variable, setVariable] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("정수");
  const [range, setRange] = useState("");
  const [required, setRequired] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [source, setSource] = useState("");
  const [checking, setChecking] = useState(false);
  const [scope, setScope] = useState<ScopeVerdict | null>(null);
  const [ack, setAck] = useState(false);

  const canSubmit = variable.trim().length > 0 && label.trim().length > 0;

  const build = (s: ScopeVerdict): DesignField => ({
    id: `manual-${Date.now()}`,
    form,
    variable: variable.trim(),
    label: label.trim(),
    type: type.trim() || "정수",
    range: range.trim() || "—",
    required,
    source: source.trim() || "수동 추가",
    endpoint: endpoint.trim() || "수동 지정",
    origin: "manual",
    rules: [],
    scope: s,
  });

  const run = async () => {
    setChecking(true);
    const v = await checkFieldScope({ variable, label, type, range, endpoint }, ctx);
    setChecking(false);
    setScope(v);
    if (v.verdict === "out_of_scope") return; // require ack via "그래도 추가"
    onAdd(build(v));
  };

  const inputCls = "w-full rounded-lg border border-[#dddde4] bg-canvas px-2 py-1.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand";

  return (
    <div className="mx-4 mb-3 rounded-xl border border-[#dddde4] bg-canvas p-3">
      <div className="flex items-center gap-2">
        <Plus className="size-4 text-brand" />
        <span className="text-sm font-semibold text-ink">{form}에 필드 추가</span>
        <button onClick={onCancel} className="ml-auto text-icon hover:text-ink" aria-label="추가 취소">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input className={inputCls} placeholder="변수명 (예: FBS)" value={variable} onChange={(e) => { setVariable(e.target.value); setScope(null); }} />
        <input className={cn(inputCls, "col-span-2")} placeholder="라벨 (예: 공복혈당)" value={label} onChange={(e) => { setLabel(e.target.value); setScope(null); }} />
        <input className={inputCls} placeholder="타입 (정수)" value={type} onChange={(e) => setType(e.target.value)} />
        <input className={inputCls} placeholder="범위 (예: 0–200)" value={range} onChange={(e) => setRange(e.target.value)} />
        <input className={inputCls} placeholder="평가변수/endpoint" value={endpoint} onChange={(e) => { setEndpoint(e.target.value); setScope(null); }} />
        <input className={cn(inputCls, "col-span-2")} placeholder="출처 (예: 프로토콜 §6.2)" value={source} onChange={(e) => setSource(e.target.value)} />
        <label className="flex items-center gap-1.5 text-xs text-dim">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="size-4 accent-[#08264A]" /> 필수
        </label>
      </div>

      {scope && (
        <div className="mt-2 flex items-center gap-2">
          <ScopeBadge s={scope} />
          <span className="text-[11px] text-dim">{scope.rationale}</span>
        </div>
      )}

      {scope && scope.verdict !== "in_scope" && (
        <div className={cn("mt-2 flex items-start gap-2 rounded-xl border p-2.5", scope.verdict === "out_of_scope" ? "border-danger/30 bg-[#fdecec]" : "border-warning/40 bg-[#fef6e7]")}>
          <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", scope.verdict === "out_of_scope" ? "text-danger" : "text-warning")} />
          <div className="min-w-0 text-[11px] leading-relaxed text-dim">
            {scope.verdict === "out_of_scope"
              ? "이 항목은 승인된 프로토콜·SOP에서 근거를 찾지 못했습니다. 잘못 추가하는 것일 수 있어요."
              : "이 항목은 근거가 약합니다 — 추가는 가능하나 프로토콜·SOP 근거를 확인하세요."}
            {scope.suggested_source && <span className="mt-0.5 block text-icon">추천 출처: {scope.suggested_source}</span>}
            {scope.verdict === "out_of_scope" && (
              <label className="mt-1.5 flex items-start gap-1.5 text-ink">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-3.5 accent-[#08264A]" />
                범위 밖임을 검토했고 추가합니다 (감사추적 기록)
              </label>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {scope?.verdict === "out_of_scope" ? (
          <Button variant="brand" size="sm" disabled={!ack} onClick={() => onAdd(build(scope))}>그래도 추가</Button>
        ) : (
          <Button variant="brand" size="sm" disabled={!canSubmit || checking} onClick={run}>
            {checking ? <><Loader2 className="size-3.5 animate-spin" /> 범위 확인 중…</> : "범위 확인 후 추가"}
          </Button>
        )}
        <button onClick={onCancel} className="text-xs text-dim hover:text-ink">취소</button>
      </div>
    </div>
  );
}

function BuildBadge({ live }: { live?: boolean }) {
  if (live) {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-[#f3f7e0] px-2 py-0.5 text-[10px] font-medium text-[#4d6a0f]">
        <span className="size-1.5 rounded-full bg-positive" />③에서 실행 중 · 검증엔진 1:1
      </span>
    );
  }
  return <span className="rounded-pill bg-elevated px-2 py-0.5 text-[10px] font-medium text-dim">명세 확정 · EDC 반영 대기</span>;
}

function SchemaRow({
  f,
  edited,
  editable,
  onEdit,
  onRemove,
}: {
  f: DesignField;
  edited: boolean;
  editable: boolean;
  onEdit: (patch: Partial<DesignField>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(f.range);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(f.label);
  const crossSource = f.rules.some((r) => r.layer === "L3");

  return (
    <tr className="border-t border-[#f1f1f5] align-top">
      <td className="py-2.5 pr-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-icon">{f.variable}</span>
          <OriginBadge origin={f.origin} />
          {crossSource && <span className="rounded-pill bg-[#fdecec] px-1.5 py-0.5 text-[9px] font-medium text-danger">↔ 교차소스</span>}
          {edited && <span className="rounded-pill bg-[#f3f7e0] px-1.5 py-0.5 text-[9px] font-medium text-[#4d6a0f]">수정됨</span>}
          {f.scope && <ScopeBadge s={f.scope} />}
        </div>
        {editable && editingLabel ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => {
              onEdit({ label: labelDraft });
              setEditingLabel(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onEdit({ label: labelDraft });
                setEditingLabel(false);
              }
            }}
            className="mt-0.5 w-full rounded-md border border-brand bg-canvas px-1.5 py-0.5 text-[13px] font-semibold text-ink outline-none"
          />
        ) : editable ? (
          <button
            onClick={() => {
              setLabelDraft(f.label);
              setEditingLabel(true);
            }}
            className="group mt-0.5 inline-flex items-center gap-1 text-left text-[13px] font-semibold text-ink hover:text-brand"
          >
            {f.label}
            <Pencil className="size-3 shrink-0 text-icon opacity-0 group-hover:opacity-100" />
          </button>
        ) : (
          <div className="mt-0.5 text-[13px] font-semibold text-ink">{f.label}</div>
        )}
        <div className="text-[11px] text-icon">↳ {f.endpoint}</div>
      </td>
      <td className="py-2.5 pr-3 text-xs text-dim">{f.type}</td>
      <td className="py-2.5 pr-3">
        {!editable ? (
          <span className="text-xs text-ink">{f.range}</span>
        ) : editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onEdit({ range: draft });
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onEdit({ range: draft });
                setEditing(false);
              }
            }}
            className="w-24 rounded-md border border-brand bg-canvas px-1.5 py-0.5 text-xs text-ink outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(f.range);
              setEditing(true);
            }}
            className="group inline-flex items-center gap-1 text-xs text-ink hover:text-brand"
          >
            {f.range}
            <Pencil className="size-3 shrink-0 text-icon opacity-0 group-hover:opacity-100" />
          </button>
        )}
      </td>
      <td className="py-2.5 pr-3">
        {editable ? (
          <button
            onClick={() => onEdit({ required: !f.required })}
            className={cn("rounded-pill px-2 py-0.5 text-[11px] font-medium", f.required ? "bg-brand text-white" : "bg-elevated text-dim")}
          >
            {f.required ? "필수" : "선택"}
          </button>
        ) : (
          <span className={cn("rounded-pill px-2 py-0.5 text-[11px] font-medium", f.required ? "bg-brand text-white" : "bg-elevated text-dim")}>
            {f.required ? "필수" : "선택"}
          </span>
        )}
      </td>
      <td className="py-2.5 pr-3 text-[11px] text-icon">{f.source}</td>
      <td className="py-2.5 pr-3">
        <div className="flex flex-wrap gap-1">
          {f.rules.length === 0 ? <span className="text-[11px] text-icon">—</span> : f.rules.map((r, i) => <RuleChip key={i} r={r} />)}
        </div>
      </td>
      <td className="py-2.5">
        {editable ? (
          <button onClick={onRemove} className="text-icon transition-colors hover:text-danger" title="이 AI 도출 필드 삭제" aria-label="필드 삭제">
            <Trash2 className="size-3.5" />
          </button>
        ) : (
          <span title="결정적 규칙 — 검증엔진이 소유(읽기전용)" className="inline-flex text-icon">
            <Lock className="size-3.5" />
          </span>
        )}
      </td>
    </tr>
  );
}

function RuleRow({
  r,
  field,
  source,
  origin,
  editable,
  edited,
  onEdit,
  onRemove,
}: {
  r: DesignRule;
  field: string;
  source: string;
  origin: "core" | "ai" | "manual";
  editable: boolean;
  edited: boolean;
  onEdit: (desc: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(r.desc);

  return (
    <div className="flex items-start gap-2 px-4 py-2.5">
      <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", sevStyle[r.sev].dot)} />
      <div className="min-w-0 flex-1">
        {editable && editing ? (
          <textarea
            autoFocus
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onEdit(draft.trim() || r.desc);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onEdit(draft.trim() || r.desc);
                setEditing(false);
              }
            }}
            className="w-full rounded-md border border-brand bg-canvas px-2 py-1 text-sm text-ink outline-none"
          />
        ) : editable ? (
          <button
            onClick={() => {
              setDraft(r.desc);
              setEditing(true);
            }}
            className="group inline-flex items-start gap-1 text-left text-sm text-ink hover:text-brand"
          >
            <span>{r.desc}</span>
            <Pencil className="mt-0.5 size-3 shrink-0 text-icon opacity-0 group-hover:opacity-100" />
          </button>
        ) : (
          <p className="text-sm text-ink">{r.desc}</p>
        )}
        <p className="mt-0.5 text-[11px] text-icon">
          {field} · {source}
          {edited && <span className="ml-1 rounded-pill bg-[#f3f7e0] px-1.5 py-0.5 text-[9px] font-medium text-[#4d6a0f]">수정됨</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <OriginBadge origin={origin} kind="rule" />
        {editable && (
          <button onClick={onRemove} className="text-icon transition-colors hover:text-danger" title="이 규칙 삭제" aria-label="규칙 삭제">
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Header({ compact, source }: { compact?: boolean; source?: "ai" | "seed" }) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            EDC·ePRO 설계
          </h1>
          <p className="text-xs text-dim">승인본 v1.0에서 도출 · 검토 후 설계 vD1.0으로 확정</p>
        </div>
        {source === "seed" && <span className="rounded-pill bg-elevated px-2 py-0.5 text-[10px] text-dim">기준 템플릿</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">Study Build · 데이터 설계</p>
      <h1 className="text-[32px] font-bold leading-tight text-ink" style={{ fontFamily: "var(--font-display)" }}>
        EDC·ePRO 설계
      </h1>
      <p className="max-w-xl text-[15px] leading-relaxed text-dim">
        승인한 프로토콜·SOP(v1.0)에서 데이터 모델·환자앱 폼·검증 규칙을 도출합니다. 검토·수정해 <b className="text-ink">설계 vD1.0</b>으로 확정하면, ePRO 폼은 ③ 환자앱에서 그대로 실행되고 방문 CRF는 명세로 전달됩니다.
      </p>
    </div>
  );
}

// ── main ───────────────────────────────────────────────────────────────────────

export function Step2Design({
  handoff,
  config,
  onConfigChange,
  onNext,
  design,
  onDesignChange,
}: {
  handoff: StudyHandoff;
  config: Config;
  onConfigChange: (c: Config) => void;
  onNext: () => void;
  design: DesignResult | null;
  onDesignChange: Dispatch<SetStateAction<DesignResult | null>>;
}) {
  // ② design result is lifted into the shell so back/forward navigation preserves it
  // (manual-added fields, AI-field edits) instead of re-deriving on every revisit.
  const result = design;
  const setResult = onDesignChange;
  const [stage, setStage] = useState<"deriving" | "review">(design ? "review" : "deriving");
  const [tab, setTab] = useState<"schema" | "epro" | "rules" | "soa">("schema");
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [editedRules, setEditedRules] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<DesignField[]>([]);
  const [ack, setAck] = useState(false);
  const [addingForm, setAddingForm] = useState<string | null>(null);

  useEffect(() => {
    if (result) {
      setStage("review"); // already derived (e.g. returned via back) → keep edits, don't re-derive
      return;
    }
    let alive = true;
    setStage("deriving");
    deriveDesign(handoff.docs ?? []).then((r) => {
      if (!alive) return;
      setResult(r);
      setStage("review");
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff]);

  const fields = result?.fields ?? [];
  const [R0, R1] = config.ranges.isi_total;
  const eproFields = fields.filter((f) => f.form === EPRO_FORM);
  const crfFields = fields.filter((f) => f.form !== EPRO_FORM);
  const allRules = fields.flatMap((f) => f.rules);
  const ruleCount = allRules.length;
  const l3plus = allRules.filter((r) => !LAYER_META[r.layer].std).length;
  const coreRuleCount = fields.filter((f) => f.origin === "core").reduce((n, f) => n + f.rules.length, 0);
  const aiRuleCount = ruleCount - coreRuleCount;
  const ctx: ScopeContext = { summary: handoff.summary, docAssessment: handoff.docAssessment };
  const manualFields = fields.filter((f) => f.origin === "manual");
  const manualOutOfScope = manualFields.filter((f) => f.scope?.verdict === "out_of_scope");

  // ── handlers (mutate AI-derived only; core is owned by validate.ts → read-only) ──

  const updateField = (id: string, patch: Partial<DesignField>) => {
    setResult((prev) => (prev ? { ...prev, fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) } : prev));
    setEdited((s) => new Set(s).add(id));
  };

  const removeField = (id: string) => {
    setResult((prev) => {
      if (!prev) return prev;
      const f = prev.fields.find((x) => x.id === id);
      if (!f || f.origin === "core") return prev; // core → no-op
      if (f.origin === "ai") setRemoved((rm) => (rm.some((x) => x.id === id) ? rm : [...rm, f])); // ai → restorable; manual → just remove
      return { ...prev, fields: prev.fields.filter((x) => x.id !== id) };
    });
  };

  const addField = (f: DesignField) => {
    setResult((prev) => (prev ? { ...prev, fields: [...prev.fields, f] } : prev));
    setAddingForm(null);
  };

  const restoreField = (id: string) => {
    setRemoved((rm) => {
      const f = rm.find((x) => x.id === id);
      if (f) {
        setResult((prev) => (prev && !prev.fields.some((x) => x.id === id) ? { ...prev, fields: [...prev.fields, f] } : prev));
      }
      return rm.filter((x) => x.id !== id);
    });
  };

  const updateRule = (fieldId: string, idx: number, desc: string) => {
    setResult((prev) =>
      prev
        ? { ...prev, fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, rules: f.rules.map((r, i) => (i === idx ? { ...r, desc } : r)) } : f)) }
        : prev,
    );
    setEditedRules((s) => new Set(s).add(`${fieldId}#${idx}`));
  };

  const removeRule = (fieldId: string, idx: number) => {
    setResult((prev) =>
      prev ? { ...prev, fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, rules: f.rules.filter((_, i) => i !== idx) } : f)) } : prev,
    );
  };

  // ── integrity gates (deterministic, hard-blockable) ──

  const gates = [
    {
      label: "ePRO 필수 필드마다 검증규칙 ≥1",
      pass: fields.filter((f) => f.origin === "core" && f.required).every((f) => f.rules.length > 0),
      how: "필수 ePRO 필드 중 검증 규칙이 비어 있는 항목이 있습니다 — 각 필드에 최소 L1 범위 규칙을 추가하세요.",
    },
    {
      label: "교차소스(L3) 점검 존재",
      pass: allRules.some((r) => r.layer === "L3"),
      how: "소스 간 교차검증(L3)이 하나도 없습니다 — 자가보고↔기기/임상측정 점검을 최소 1개 두세요.",
    },
    {
      label: "필수 필드 §출처 명시",
      pass: fields.filter((f) => f.required).every((f) => !!f.source),
      how: "출처(§)가 비어 있는 필수 필드가 있습니다 — 프로토콜/SOP 근거 위치를 채우세요.",
    },
  ];

  const fieldMapping = {
    pass: fields.some((f) => f.origin === "ai"),
    note: "AI가 ①의 승인 문서에서 방문 CRF 필드를 도출하지 못했습니다. ePRO 전용 설계라면 그대로 진행해도 되고, 아니라면 ①에서 올바른 프로토콜/SOP를 올렸는지 확인하세요.",
  };

  const checksPass = gates.every((c) => c.pass);
  const canFreeze = checksPass && ack;

  // ── deriving stage ──

  if (stage === "deriving") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <Header />
        <div className="flex items-center gap-3 rounded-2xl border border-[#eeeef4] bg-surface px-5 py-6">
          <Loader2 className="size-5 animate-spin text-brand" />
          <div>
            <p className="text-sm font-semibold text-ink">승인본 v1.0에서 EDC·ePRO 설계 도출 중…</p>
            <p className="mt-0.5 text-xs text-dim">ePRO 척도 설문(결정적) + 방문 CRF·평가 일정(AI 도출) + 검증·탐지 규칙(L1–L6·안전)</p>
          </div>
        </div>
      </div>
    );
  }

  // ── review stage ──

  const tabs = [
    { key: "schema" as const, label: "데이터 사전(aCRF)", icon: Database, count: fields.length },
    { key: "epro" as const, label: "ePRO 폼", icon: Smartphone, count: eproFields.length },
    { key: "rules" as const, label: "검증·탐지 규칙", icon: ScanLine, count: ruleCount },
    { key: "soa" as const, label: "평가 일정", icon: CalendarDays, count: result?.visits.length },
  ];

  return (
    <div className="grid animate-[fadeIn_320ms_ease-out] grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* LEFT — design control rail */}
      <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-6">
        {/* A. tab nav */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface p-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                tab === t.key ? "bg-elevated font-semibold text-ink" : "text-dim hover:bg-elevated/50",
              )}
            >
              <t.icon className="size-4 shrink-0" />
              <span>{t.label}</span>
              {t.count != null && <span className="ml-auto text-xs text-icon">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* B. design integrity */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-dim">설계 무결성</p>
          <div className="mt-3 flex flex-col gap-3">
            {gates.map((c, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-start gap-2 text-xs">
                  <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full", c.pass ? "bg-positive text-onaccent" : "bg-warning text-white")}>
                    {c.pass ? <Check className="size-2.5" /> : "!"}
                  </span>
                  <span className={c.pass ? "text-dim" : "text-warning"}>{c.label}</span>
                </div>
                {!c.pass && <p className="pl-6 text-[11px] leading-relaxed text-warning">{c.how}</p>}
              </div>
            ))}
            {/* advisory (fieldMapping) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-start gap-2 text-xs">
                <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px]", fieldMapping.pass ? "bg-positive text-onaccent" : "bg-elevated text-icon")}>
                  {fieldMapping.pass ? <Check className="size-2.5" /> : "ⓘ"}
                </span>
                <span className="text-dim">
                  프로토콜 평가변수 → 필드 매핑 <span className="text-icon">(자문)</span>
                </span>
              </div>
              {!fieldMapping.pass && <p className="pl-6 text-[11px] leading-relaxed text-icon">{fieldMapping.note}</p>}
            </div>
            {/* advisory (manual field scope guard) */}
            {manualFields.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-start gap-2 text-xs">
                  <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px]", manualOutOfScope.length === 0 ? "bg-positive text-onaccent" : "bg-warning text-white")}>
                    {manualOutOfScope.length === 0 ? <Check className="size-2.5" /> : "!"}
                  </span>
                  <span className="text-dim">
                    수동 추가 필드 범위 확인 <span className="text-icon">(자문)</span>
                  </span>
                </div>
                <p className="pl-6 text-[11px] leading-relaxed text-icon">
                  수동 {manualFields.length}건{manualOutOfScope.length > 0 ? ` · 범위 밖 ${manualOutOfScope.length}건(검토 후 추가됨)` : " · 전부 범위 내/주의"}
                </p>
              </div>
            )}
          </div>
          <div className="mt-3 border-t border-[#f1f1f5] pt-3 text-[11px] text-icon">
            교차소스·중앙검증(L3·L5·L6) {l3plus}건 — 표준 EDC가 못 잡는 영역
          </div>
        </div>

        {/* C. GATE — design freeze */}
        <div className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
          <label className="flex cursor-pointer items-start gap-2">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-4 accent-[#08264A]" />
            <span className="text-xs leading-relaxed text-dim">설계(스키마·규칙·일정)를 검토했고, 이 내용으로 확정합니다.</span>
          </label>
          <Button variant="brand" className="mt-3 w-full" disabled={!canFreeze} onClick={onNext}>
            설계 vD1.0 확정 → ③ 데이터 수집
          </Button>
          {!checksPass && <p className="mt-2 text-[11px] text-warning">무결성 항목을 먼저 충족하세요.</p>}
        </div>
      </aside>

      {/* RIGHT — artifact */}
      <div className="flex min-w-0 flex-col gap-4">
        <Header compact source={result?.source} />

        {tab === "schema" && (
          <div className="flex flex-col gap-5">
            {[EPRO_FORM, ...new Set(crfFields.map((f) => f.form))].map((form) => {
              const rows = fields.filter((f) => f.form === form);
              if (rows.length === 0) return null;
              return (
                <div key={form} className="overflow-hidden rounded-2xl border border-[#eeeef4] bg-surface">
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#eeeef4] bg-canvas px-4 py-2.5">
                    {form === EPRO_FORM ? <Smartphone className="size-4 text-brand" /> : <Database className="size-4 text-brand" />}
                    <span className="text-sm font-semibold text-ink">{form}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => setAddingForm(addingForm === form ? null : form)}
                        className="inline-flex items-center gap-1 rounded-pill border border-[#dddde4] bg-surface px-2 py-1 text-[11px] font-medium text-brand hover:bg-elevated focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <Plus className="size-3.5" /> 필드 추가
                      </button>
                      <BuildBadge live={form === EPRO_FORM} />
                    </div>
                  </div>
                  <div className="overflow-x-auto px-4 pb-2">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wide text-icon">
                          <th className="py-2 pr-3 font-medium">변수 / 라벨 · 평가변수</th>
                          <th className="py-2 pr-3 font-medium">타입</th>
                          <th className="py-2 pr-3 font-medium">범위</th>
                          <th className="py-2 pr-3 font-medium">필수</th>
                          <th className="py-2 pr-3 font-medium">출처</th>
                          <th className="py-2 pr-3 font-medium">검증 규칙</th>
                          <th className="py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((f) => (
                          <SchemaRow
                            key={f.id}
                            f={f}
                            edited={edited.has(f.id)}
                            editable={f.origin !== "core"}
                            onEdit={(p) => updateField(f.id, p)}
                            onRemove={() => removeField(f.id)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {addingForm === form && <AddFieldForm form={form} ctx={ctx} onAdd={addField} onCancel={() => setAddingForm(null)} />}
                </div>
              );
            })}

            {removed.length > 0 && (
              <div className="rounded-2xl border border-dashed border-[#dddde4] bg-surface p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-dim">삭제된 AI 도출 항목 · {removed.length}</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {removed.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-[11px] text-icon line-through">{f.variable}</span>
                      <span className="truncate text-dim line-through">{f.label}</span>
                      <button onClick={() => restoreField(f.id)} className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-brand hover:underline">
                        <RotateCcw className="size-3" /> 복원
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-dim">
              <span className="rounded-pill bg-elevated px-1.5 py-0.5 text-[9px] font-medium text-dim">AI 도출</span> 항목만 라벨·범위·필수 수정 및 행 삭제 가능 —{" "}
              <span className="text-info">결정적·코드</span>는 검증엔진이 소유(읽기전용 <Lock className="inline size-3 -translate-y-px" />), 변경은 설정·배포로.{" "}
              <span className="text-danger">↔ 교차소스</span>=다른 필드와 상호 검증(L3).
            </p>
          </div>
        )}

        {tab === "epro" && (
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="w-[300px] shrink-0 overflow-hidden rounded-[2rem] border-[6px] border-[#1c1c1a] bg-surface">
              <div className="flex items-center gap-2 bg-brand px-4 py-2 text-white">
                <span className="size-1.5 animate-pulse rounded-full bg-point" />
                <span className="text-[11px] font-medium">검증 계층 활성 · 실시간 점검</span>
              </div>
              <div className="flex flex-col gap-2.5 p-4">
                <p className="text-xs text-dim">오늘의 수면 기록 · S-007</p>
                {eproFields
                  .filter((f) => f.variable !== "TST")
                  .map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-xl border border-[#eeeef4] bg-canvas px-3 py-2.5">
                      <span className="text-xs text-dim">{f.label}</span>
                      <span className="text-[11px] text-icon">{f.range}</span>
                    </div>
                  ))}
                <div className="mt-1 rounded-lg bg-elevated px-3 py-2 text-[11px] text-dim">입력 시점에 L1·L2·L5·L6 실시간 점검</div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink">이 폼이 곧 ③ 환자앱의 런타임입니다</p>
                <BuildBadge live />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-dim">
                아래 5개 ePRO 필드는 <b className="text-ink">검증 엔진과 1:1로 ③ 환자앱에서 실시간 작동</b>합니다(좌측 미리보기 = 실제 엔진 출력). 방문 CRF는 동일 규칙으로 <b className="text-ink">명세가 확정</b>되며, EDC 반영 단계로 이어집니다.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {eproFields.map((f) => (
                  <div key={f.id} className="rounded-xl border border-[#eeeef4] bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{f.label}</span>
                      <span className="text-[11px] text-icon">{f.range}</span>
                      <span className="ml-auto flex gap-1">
                        {f.rules.map((r, i) => (
                          <RuleChip key={i} r={r} />
                        ))}
                      </span>
                    </div>
                    {f.rules.map((r, i) => (
                      <p key={i} className="mt-1 text-[11px] leading-relaxed text-dim">
                        <span className={cn("font-semibold", sevStyle[r.sev].text)}>{r.layer}</span> · {r.desc}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "rules" && (
          <div className="flex flex-col gap-4">
            {/* A. validation threshold cards */}
            <div className="overflow-hidden rounded-2xl border border-[#eeeef4] bg-surface">
              <div className="flex flex-wrap items-center gap-2 border-b border-[#eeeef4] bg-canvas px-4 py-2.5">
                <SlidersHorizontal className="size-4 text-brand" />
                <span className="text-sm font-semibold text-ink">검증 임계값 · 이 스터디 기준</span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-pill bg-[#f3f7e0] px-2 py-0.5 text-[10px] font-medium text-[#4d6a0f]">
                  <span className="size-1.5 rounded-full bg-positive" />③ 입력·⑤ 대량검증이 실제 사용
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
                {THRESHOLDS.map((t) => (
                  <ThresholdField
                    key={t.key}
                    label={t.label}
                    unit={t.unit}
                    hint={t.hint}
                    value={config[t.key]}
                    onChange={(n) => onConfigChange({ ...config, [t.key]: n })}
                  />
                ))}
              </div>
              <div className="border-t border-[#f1f1f5] px-4 py-2.5 text-[11px] leading-relaxed text-icon">
                척도 범위(ISI {R0}–{R1} 등)는 <b className="text-dim">검증 도구 고정값</b>이라 읽기전용 · 위 임계값은 <b className="text-dim">프로토콜 기준</b>이라 편집 가능 — 바꾸면 ③ 수집·⑤ 대량검증 결과가 함께 달라집니다.
              </div>
            </div>

            {/* B. summary banner */}
            <div className="flex items-start gap-2 rounded-2xl bg-elevated p-3 text-xs leading-relaxed text-dim">
              <ScanLine className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>
                설계에서 도출된 <b className="text-ink">검증·탐지 규칙 {ruleCount}건</b> — ③ 데이터 수집에서 <b className="text-ink">입력 시점에 실시간 작동</b>합니다. 이 중 <b className="text-ink">{l3plus}건이 L3·L5·L6</b>(교차소스·코호트·개인기준)로, 표준 EDC는 입력 시점에 잡지 못합니다.
                <span className="mt-1 block">
                  출처: <b className="text-info">결정적·코드 {coreRuleCount}건</b>(검증엔진 · 읽기전용) · <b className="text-dim">AI 도출 {aiRuleCount}건</b>(v1.0 §에서 추출 · 설명 수정·삭제 가능)
                </span>
              </span>
            </div>

            {/* C. rule groups by layer */}
            {LAYER_ORDER.map((L) => {
              const items = fields
                .flatMap((f) => f.rules.map((r, idx) => ({ r, idx, fieldId: f.id, field: f.label, source: f.source, origin: f.origin })))
                .filter((it) => it.r.layer === L);
              if (items.length === 0) return null;
              return (
                <div key={L} className="overflow-hidden rounded-2xl border border-[#eeeef4] bg-surface">
                  <div className="flex items-center gap-2 border-b border-[#eeeef4] bg-canvas px-4 py-2.5">
                    <span className="font-mono text-sm font-bold text-ink">{L}</span>
                    <span className="text-xs text-dim">{LAYER_META[L].name}</span>
                    {!LAYER_META[L].std && <span className="rounded-pill bg-[#eef3f9] px-2 py-0.5 text-[10px] font-medium text-info">표준 EDC 사각지대</span>}
                    <span className="ml-auto text-xs text-icon">{items.length}건</span>
                  </div>
                  <div className="divide-y divide-[#f1f1f5]">
                    {items.map((it) => (
                      <RuleRow
                        key={`${it.fieldId}#${it.idx}`}
                        r={it.r}
                        field={it.field}
                        source={it.source}
                        origin={it.origin}
                        editable={it.origin === "ai"}
                        edited={editedRules.has(`${it.fieldId}#${it.idx}`)}
                        onEdit={(desc) => updateRule(it.fieldId, it.idx, desc)}
                        onRemove={() => removeRule(it.fieldId, it.idx)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "soa" &&
          (() => {
            const visits = result?.visits ?? [];
            const rows = [...new Set(visits.flatMap((v) => v.assessments))];
            const isPrimary = (label: string) => /1차|week\s*4|4주/i.test(label);
            return (
              <div className="flex flex-col gap-4">
                {/* 상시·매일 수집 (SOP — 방문 비의존): 매일 ISI ePRO + 스마트워치 상시/일별 */}
                <div className="overflow-hidden rounded-2xl border border-[#eeeef4] bg-surface">
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#eeeef4] bg-canvas px-4 py-2.5">
                    <Watch className="size-4 text-brand" />
                    <span className="text-sm font-semibold text-ink">상시·매일 수집 (방문 비의존)</span>
                    <span className="rounded-pill bg-[#eef3f9] px-2 py-0.5 text-[10px] font-medium text-info">SOP §상시수집</span>
                  </div>
                  <div className="divide-y divide-[#f1f1f5]">
                    {CONTINUOUS.map((c) => (
                      <div key={c.label} className="flex items-start gap-3 px-4 py-3">
                        <c.icon className="mt-0.5 size-4 shrink-0 text-icon" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-ink">{c.label}</span>
                            <span className="rounded-pill bg-[#f3f7e0] px-2 py-0.5 text-[10px] font-medium text-[#4d6a0f]">{c.cadence}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-dim">{c.detail}</p>
                        </div>
                        <span className="hidden shrink-0 text-[11px] text-icon sm:block">{c.source}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#f1f1f5] px-4 py-2.5 text-[11px] leading-relaxed text-icon">
                    이 항목들은 특정 방문이 아니라 <b className="text-dim">전 구간 연속/매일</b> 수집됩니다 — 아래 방문 SoA와 별개로 운영됩니다.
                  </div>
                </div>

                {/* 방문 기반 평가 일정 */}
                <div className="overflow-hidden rounded-2xl border border-[#eeeef4] bg-surface">
                <div className="flex flex-wrap items-center gap-2 border-b border-[#eeeef4] bg-canvas px-4 py-2.5">
                  <CalendarDays className="size-4 text-brand" />
                  <span className="text-sm font-semibold text-ink">평가 일정 (Schedule of Assessments)</span>
                  <span className="rounded-pill bg-elevated px-2 py-0.5 text-[10px] font-medium text-dim">AI 도출 · 프로토콜 §SoA</span>
                </div>
                {visits.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-dim">평가 일정이 도출되지 않았습니다.</p>
                ) : (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr>
                          <th className="py-2 pr-3 text-[11px] font-medium uppercase text-icon">평가 항목</th>
                          {visits.map((v, i) => (
                            <th key={i} className={cn("px-2 py-2 text-center text-[11px] font-semibold", isPrimary(v.label) ? "text-brand" : "text-dim")}>
                              <div className="min-w-[72px] leading-tight">{v.label}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((a) => (
                          <tr key={a} className="border-t border-[#f1f1f5]">
                            <td className="py-2 pr-3 text-sm text-ink">{a}</td>
                            {visits.map((v, i) => {
                              const on = v.assessments.includes(a);
                              const primary = on && isPrimary(v.label);
                              return (
                                <td key={i} className="px-2 py-2 text-center">
                                  {on ? (
                                    <span className={cn("inline-block size-2.5 rounded-full", primary ? "bg-brand ring-2 ring-brand/25" : "bg-positive")} />
                                  ) : (
                                    <span className="text-[#dddde4]">·</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="border-t border-[#f1f1f5] px-4 py-2.5 text-[11px] text-icon">
                  <span className="text-positive">●</span> 실시 · <span className="text-brand">●</span> 1차 평가 시점 — 프로토콜의 평가 일정에서 AI가 도출, 사람이 확정합니다.
                </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
