import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  analyzeSingle,
  SLEEP_CONFIG,
  type Config,
  type SleepRow,
  type ValFinding,
} from "@/somnus/engine/validate";

// ── 상수 / 데이터 ──────────────────────────────────────────────────────────
export const LIVE_SUBJECT = "S-101"; // 라이브 수집 대상자(셸이 dataset에 추가)
const BASE_DATE = "2026-06-08"; // seq=0의 기준일
const addDays = (iso: string, n: number) =>
  new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);

type Draft = {
  isi: number;
  ess: number;
  phq9: number;
  item9: number;
  gad7: number;
  tst: number;
};

const NORMAL: Draft = { isi: 12, ess: 8, phq9: 6, item9: 0, gad7: 5, tst: 420 };

const PRESETS: { key: string; label: string; draft: Draft }[] = [
  { key: "normal", label: "정상", draft: NORMAL },
  { key: "range", label: "ISI 범위초과", draft: { ...NORMAL, isi: 40 } }, // isi 40 > 허용 28 → range 채널 block
  { key: "safety", label: "우울·자살사고 신호", draft: { ...NORMAL, phq9: 18, item9: 2 } }, // 입력시점엔 finding 없음
];

export function toRecord(d: Draft, seq: number): SleepRow {
  return {
    subject_id: LIVE_SUBJECT,
    date: addDays(BASE_DATE, seq * 7),
    isi_total: d.isi,
    ess_total: d.ess,
    phq9_total: d.phq9,
    phq9_item9: d.item9,
    gad7_total: d.gad7,
    diary_tst: d.tst,
    entry_timestamp: `${addDays(BASE_DATE, seq * 7)}T21:05`,
  };
}

// severity → 스타일 매핑 (PatientApp 쪽 — 라벨이 Step3Collect의 FlagRow와 다름)
const sevStyle: Record<
  ValFinding["severity"],
  { dot: string; edge: string; label: string }
> = {
  block: { dot: "bg-danger", edge: "border-l-danger", label: "확인 필요" },
  critical: { dot: "bg-danger", edge: "border-l-danger", label: "확인 필요" },
  high: { dot: "bg-warning", edge: "border-l-warning", label: "확인" },
  medium: { dot: "bg-warning", edge: "border-l-warning", label: "확인" },
  low: { dot: "bg-warning", edge: "border-l-warning", label: "확인" },
};

// ── NumField (입력 필드 + 인라인 finding) ───────────────────────────────────
function NumField({
  label,
  value,
  max,
  onChange,
  find,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
  find?: ValFinding;
}) {
  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border bg-canvas px-3 py-2.5",
          find ? "border-danger/40" : "border-[#eeeef4]",
        )}
      >
        <span className="text-xs text-dim">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={cn(
              "w-16 rounded-md border bg-surface px-1.5 py-0.5 text-right text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand",
              find ? "border-danger text-danger" : "border-[#eeeef4] text-ink",
            )}
          />
          <span className="text-[11px] text-icon">/{max}</span>
        </div>
      </div>
      {find && (
        <div
          className={cn(
            "mt-1.5 rounded-lg border border-[#eeeef4] border-l-4 bg-surface p-2.5",
            sevStyle[find.severity].edge,
          )}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                sevStyle[find.severity].dot,
              )}
            />
            <span className="text-[11px] font-semibold text-ink">
              {sevStyle[find.severity].label}
            </span>
            <span className="ml-auto text-[10px] text-dim">{find.layer}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-dim">{find.msg}</p>
        </div>
      )}
    </div>
  );
}

// ── PatientApp 본체 ─────────────────────────────────────────────────────────
export function PatientApp({
  seq = 0,
  config = SLEEP_CONFIG,
  onSubmit,
}: {
  seq?: number;
  config?: Config;
  onSubmit?: (p: { row: SleepRow; findings: ValFinding[] }) => void;
}) {
  const [d, setD] = useState<Draft>(NORMAL);
  const [active, setActive] = useState("normal");
  const set = (patch: Partial<Draft>) => {
    setD((p) => ({ ...p, ...patch }));
    setActive("");
  };

  // 매 렌더 검증 (핵심) — 플랫폼과 동일한 analyzeSingle, ranges만 주입
  const record = toRecord(d, seq);
  const { findings } = analyzeSingle(record, { ranges: config.ranges });
  const findFor = (col: string) =>
    findings.find((f) => f.evidence?.startsWith(col + "="));
  const blocked = findings.some(
    (f) => f.severity === "block" || f.severity === "critical",
  );

  return (
    <div className="flex flex-col items-center gap-5">
      {/* 폰 프레임 */}
      <div className="w-[330px] overflow-hidden rounded-[2.25rem] border-[6px] border-[#1c1c1a] bg-surface">
        {/* 상단 상태바 */}
        <div className="flex items-center gap-2 bg-brand px-5 py-2.5 text-white">
          <span className="size-1.5 animate-pulse rounded-full bg-point" />
          <span className="text-xs font-medium">검증 계층 활성 · 실시간 점검</span>
        </div>
        {/* 본문 */}
        <div className="flex flex-col gap-2.5 p-4">
          <div>
            <p className="text-xs text-dim">
              {LIVE_SUBJECT} · 불면 DTx · 주간 설문
            </p>
            <h2 className="text-base font-bold text-ink">수면·기분 설문</h2>
          </div>

          <NumField
            label="불면 ISI (0–28)"
            value={d.isi}
            max={28}
            onChange={(n) => set({ isi: n })}
            find={findFor("isi_total")}
          />
          <NumField
            label="주간졸림 ESS (0–24)"
            value={d.ess}
            max={24}
            onChange={(n) => set({ ess: n })}
            find={findFor("ess_total")}
          />
          <NumField
            label="우울 PHQ-9 (0–27)"
            value={d.phq9}
            max={27}
            onChange={(n) => set({ phq9: n })}
            find={findFor("phq9_total")}
          />
          <NumField
            label="자살 사고 문항 (0–3)"
            value={d.item9}
            max={3}
            onChange={(n) => set({ item9: n })}
            find={findFor("phq9_item9")}
          />
          <NumField
            label="불안 GAD-7 (0–21)"
            value={d.gad7}
            max={21}
            onChange={(n) => set({ gad7: n })}
            find={findFor("gad7_total")}
          />
          <NumField
            label="어젯밤 수면(분)"
            value={d.tst}
            max={960}
            onChange={(n) => set({ tst: n })}
            find={findFor("diary_tst")}
          />

          <Button
            variant="navy"
            className="mt-1 w-full justify-center"
            disabled={blocked}
            onClick={() => {
              if (blocked || !onSubmit) return;
              onSubmit({ row: record, findings });
              setD(NORMAL);
              setActive("normal");
            }}
          >
            {blocked
              ? "확인이 필요해요"
              : onSubmit
                ? "플랫폼으로 제출 →"
                : "제출"}
          </Button>
        </div>
      </div>

      {/* 프리셋(빠른 입력) 영역 */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-dim">
          빠른 입력
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setD(p.draft);
                setActive(p.key);
              }}
              className={cn(
                "rounded-pill border px-3 py-1.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand",
                active === p.key
                  ? "border-brand bg-brand text-white"
                  : "border-[#dddde4] text-dim hover:bg-elevated",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-icon">
          필드는 직접 수정할 수 있어요 — 입력 즉시 검증됩니다.
        </p>
      </div>
    </div>
  );
}
