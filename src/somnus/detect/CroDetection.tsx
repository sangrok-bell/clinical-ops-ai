import { useEffect, useMemo, useState } from "react";
import { Activity, ShieldAlert, Sparkles, Loader2, Check, Watch, NotebookPen, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { studyDb, type Patient, type RespNight, type DiaryNight } from "@/somnus/data/studyDb";
import { checkNight, typicalNight, fmt, SEVERITY_RANK, type NightInput, type PtFinding, type Severity } from "@/somnus/engine/patientCheck";

const sevStyle: Record<Severity, { dot: string; text: string; bg: string }> = {
  Critical: { dot: "bg-danger", text: "text-danger", bg: "bg-[#fdecec]" },
  Major: { dot: "bg-warning", text: "text-warning", bg: "bg-[#fef6e7]" },
  Minor: { dot: "bg-icon", text: "text-dim", bg: "bg-elevated" },
};

async function askExplain(f: PtFinding, patient: string): Promise<string> {
  try {
    const r = await fetch("/api/explain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ finding: { layer: f.ec, sev: f.severity, field: `${patient}·${f.metric}`, msg: f.msg } }) });
    if (!r.ok) throw new Error();
    return (await r.json()).explanation || f.msg;
  } catch {
    return `${f.ec} · ${f.msg} — 원자료(기기 로그·수면일기)와 대조해 처리하세요.`;
  }
}

const addDay = (iso: string) => { const d = new Date(Date.parse(iso) + 86400000); return d.toISOString().slice(0, 10); };

/** Mini baseline chart: patient history (faint), mean±2sd band, today's value (red). */
function SparkBaseline({ series, value, mean, sd }: { series: number[]; value: number; mean: number; sd: number }) {
  const W = 248, H = 46, pad = 4;
  const pts = series.slice(-40);
  const lo = Math.min(value, mean - 2.5 * sd, ...pts), hi = Math.max(value, mean + 2.5 * sd, ...pts);
  const span = hi - lo || 1;
  const x = (i: number) => pad + (i / Math.max(1, pts.length - 1)) * (W - 2 * pad - 14);
  const y = (v: number) => H - pad - ((v - lo) / span) * (H - 2 * pad);
  const bandTop = y(mean + 2 * sd), bandBot = y(mean - 2 * sd);
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} className="shrink-0">
      <rect x={pad} y={Math.min(bandTop, bandBot)} width={W - 2 * pad - 14} height={Math.abs(bandBot - bandTop)} fill="#08264A" opacity="0.06" />
      <line x1={pad} x2={W - pad - 14} y1={y(mean)} y2={y(mean)} stroke="#9b9ba3" strokeWidth="1" strokeDasharray="3 3" />
      <path d={path} fill="none" stroke="#9b9ba3" strokeWidth="1.25" />
      <circle cx={W - pad - 14} cy={y(value)} r="4" fill="#C62828" />
      <text x={W - pad - 6} y={y(value) + 3} fontSize="10" fill="#C62828" fontWeight="600">{fmt(value)}</text>
    </svg>
  );
}

function FindingCard({ f, patient }: { f: PtFinding; patient: string }) {
  const [expl, setExpl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const s = sevStyle[f.severity];
  const ask = async () => { setLoading(true); setExpl(await askExplain(f, patient)); setLoading(false); };
  const kindLabel = f.kind === "within_patient" ? "환자 기준 이상 ★" : f.kind === "cross_source" ? "주관↔객관" : "규칙 위반";
  return (
    <div className={cn("rounded-xl border border-[#eeeef4] bg-surface p-3 [animation-fill-mode:both] animate-[fadeIn_240ms_ease-out]")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("size-2 rounded-full", s.dot)} />
        <span className={cn("text-xs font-semibold", s.text)}>{f.severity}</span>
        <span className="text-sm font-semibold text-ink">{f.metric}</span>
        <span className={cn("rounded-pill px-1.5 py-0.5 text-[10px] font-medium", f.kind === "within_patient" ? "bg-[#fdecec] text-danger" : "bg-elevated text-dim")}>{kindLabel}</span>
        <span className="ml-auto rounded-pill bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-dim">{f.ec}</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink">{f.msg}</p>
      {f.kind === "within_patient" && f.baseline && (
        <div className="mt-2 flex items-center gap-3 rounded-lg bg-canvas p-2">
          <SparkBaseline series={f.baseline.series} value={f.value} mean={f.baseline.mean} sd={f.baseline.sd} />
          <div className="text-[11px] leading-relaxed text-dim">
            <div>본인 평소 <b className="text-ink">{fmt(f.baseline.mean)}±{fmt(f.baseline.sd)}</b> (n={f.baseline.n})</div>
            <div>오늘 <b className="text-danger">{fmt(f.value)}</b> · <b className="text-danger">z={f.baseline.z.toFixed(1)}</b></div>
            <div className="text-[10px] text-icon">모집단 범위 내 — 표준 EDC는 통과시킴</div>
          </div>
        </div>
      )}
      {expl && <p className="mt-2 rounded-md bg-elevated p-2 text-[11px] leading-relaxed text-ink"><span className="font-semibold text-brand">AI 검토 </span>{expl}</p>}
      <div className="mt-2">
        <button onClick={ask} disabled={loading || !!expl} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline disabled:text-icon disabled:no-underline">
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}{expl ? "설명됨" : "AI 설명"}
        </button>
      </div>
    </div>
  );
}

function Num({ label, value, onChange, unit }: { label: string; value: number; onChange: (n: number) => void; unit?: string }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-[#eeeef4] bg-canvas px-2.5 py-1.5">
      <span className="text-[11px] text-dim">{label}</span>
      <span className="flex items-center gap-1">
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-16 rounded-md border border-[#eeeef4] bg-surface px-1.5 py-0.5 text-right text-sm font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand" />
        {unit && <span className="w-6 text-[10px] text-icon">{unit}</span>}
      </span>
    </label>
  );
}

export function CroDetection() {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  const [pid, setPid] = useState("P001");
  const [draft, setDraft] = useState<NightInput | null>(null);
  const [submitted, setSubmitted] = useState<NightInput | null>(null);

  useEffect(() => { studyDb.ready.then(() => setLoaded(true)).catch(() => setErr(true)); }, []);

  const patient: Patient | undefined = loaded ? studyDb.patient(pid) : undefined;
  const resp: RespNight[] = loaded ? studyDb.resp(pid) : [];
  const diary: DiaryNight[] = loaded ? studyDb.diary(pid) : [];

  useEffect(() => {
    if (!loaded || !patient) return;
    const t = typicalNight(resp, diary);
    const last = resp.at(-1)?.date ?? diary.at(-1)?.date ?? "2026-04-01";
    setDraft({ date: addDay(last), dur_min: 420, ahi: 4, resp_rate: 15, spo2_min: 94, spo2_mean: 96, snore_min: 10, bedtime: "23:30", waketime: "07:00", sol_min: 20, waso_min: 20, awakenings: 1, tst_min: 410, quality: 3, ...t } as NightInput);
    setSubmitted(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, loaded]);

  const findings = useMemo(() => (submitted && patient ? checkNight(patient, submitted, { resp, diary }).sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) : []), [submitted, patient, resp, diary]);
  const within = findings.filter((f) => f.kind === "within_patient").length;

  const set = (patch: Partial<NightInput>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  // scenario presets derived from the patient's own baseline (deterministic, demo-ready)
  const scenarios = useMemo(() => {
    if (!draft) return [] as { key: string; label: string; patch: Partial<NightInput> }[];
    const spo2 = resp.map((r) => r.spo2_mean).filter((x): x is number => x != null);
    const m = spo2.length ? spo2.reduce((a, b) => a + b, 0) / spo2.length : 96;
    return [
      { key: "normal", label: "정상 입력", patch: {} },
      { key: "spo2", label: "SpO₂ 저하(본인 기준)", patch: { spo2_mean: Math.max(90, Math.round(m - 5)), spo2_min: Math.max(88, Math.round(m - 7)) } },
      { key: "waso", label: "야간각성 급증(본인 기준)", patch: { waso_min: (draft.waso_min || 20) + 90 } },
      { key: "range", label: "범위 초과(오기입)", patch: { spo2_mean: 105 } },
      { key: "ahi", label: "AHI 신호", patch: { ahi: 16 } },
    ];
  }, [draft, resp]);
  const [activeScn, setActiveScn] = useState("normal");
  const applyScn = (s: { key: string; patch: Partial<NightInput> }) => {
    if (!patient) return;
    const t = typicalNight(resp, diary);
    const last = resp.at(-1)?.date ?? "2026-04-01";
    setDraft({ date: addDay(last), dur_min: 420, ahi: 4, resp_rate: 15, spo2_min: 94, spo2_mean: 96, snore_min: 10, bedtime: "23:30", waketime: "07:00", sol_min: 20, waso_min: 20, awakenings: 1, tst_min: 410, quality: 3, ...t, ...s.patch } as NightInput);
    setActiveScn(s.key); setSubmitted(null);
  };

  if (err) return <div className="mx-auto max-w-2xl py-16 text-center text-sm text-dim">스터디 데이터셋을 불러오지 못했습니다. (public/data/study.json)</div>;
  if (!loaded || !patient || !draft) return <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 py-20 text-sm text-dim"><Loader2 className="size-4 animate-spin text-brand" /> 스터디 데이터베이스 적재 중…</div>;

  const patients = studyDb.patients();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">CRO Detection · 실시간 정합성 감지</p>
        <h1 className="text-[32px] font-bold leading-tight text-ink" style={{ fontFamily: "var(--font-display)" }}>환자 일일 입력 · CRO 감지</h1>
        <p className="max-w-3xl text-[15px] leading-relaxed text-dim">
          환자가 매일 밤 입력하는 수면일기와 스마트워치(호흡디텍팅) 데이터를, <b className="text-ink">결정적 규칙(EC)</b>과 <b className="text-ink">그 환자 자신의 과거 분포</b>에 대조해 점검합니다.
          단순 오기입은 ePRO도 잡지만, <b className="text-ink">"다른 환자에겐 정상인데 이 환자에겐 이상"</b>은 여기서만 드러납니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* LEFT — patient A context + input */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-dim">대상자</span>
              <select value={pid} onChange={(e) => setPid(e.target.value)} className="rounded-pill border border-[#dddde4] bg-canvas px-2 py-0.5 text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand">
                {patients.slice(0, 30).map((p) => <option key={p.patient_id} value={p.patient_id}>{p.patient_id}</option>)}
              </select>
            </div>
            <p className="mt-2 text-lg font-bold text-ink">환자 A <span className="font-mono text-sm font-medium text-dim">· {patient.patient_id}</span></p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-dim">
              <span>{patient.age}세 {patient.sex}</span><span>{patient.arm}</span><span>{patient.dx}</span><span>기저 ISI {patient.baseline_isi}</span>
            </div>
            <p className="mt-2 rounded-lg bg-elevated px-2.5 py-1.5 text-[11px] text-dim">누적 수집 <b className="text-ink">호흡 {resp.length}박 · 일기 {diary.length}박</b> — 이 이력이 "본인 기준" baseline</p>
          </div>

          <div className="rounded-2xl border border-[#eeeef4] bg-surface p-4">
            <div className="flex items-center gap-1.5"><Watch className="size-4 text-brand" /><span className="text-sm font-semibold text-ink">오늘 밤 입력</span><span className="ml-auto font-mono text-[11px] text-icon">{draft.date}</span></div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {scenarios.map((s) => <button key={s.key} onClick={() => applyScn(s)} className={cn("rounded-pill border px-2 py-0.5 text-[10px] transition-colors", activeScn === s.key ? "border-brand bg-brand text-white" : "border-[#dddde4] text-dim hover:bg-elevated")}>{s.label}</button>)}
            </div>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-icon">스마트워치 · 호흡디텍팅</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <Num label="평균SpO₂" value={draft.spo2_mean} unit="%" onChange={(v) => set({ spo2_mean: v })} />
              <Num label="최저SpO₂" value={draft.spo2_min} unit="%" onChange={(v) => set({ spo2_min: v })} />
              <Num label="AHI" value={draft.ahi} onChange={(v) => set({ ahi: v })} />
              <Num label="평균호흡수" value={draft.resp_rate} unit="회" onChange={(v) => set({ resp_rate: v })} />
              <Num label="코골이" value={draft.snore_min} unit="분" onChange={(v) => set({ snore_min: v })} />
              <Num label="측정시간" value={draft.dur_min} unit="분" onChange={(v) => set({ dur_min: v })} />
            </div>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-icon">수면일기 · 주관</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <Num label="총수면(TST)" value={draft.tst_min} unit="분" onChange={(v) => set({ tst_min: v })} />
              <Num label="입면(SOL)" value={draft.sol_min} unit="분" onChange={(v) => set({ sol_min: v })} />
              <Num label="각성(WASO)" value={draft.waso_min} unit="분" onChange={(v) => set({ waso_min: v })} />
              <Num label="수면질" value={draft.quality} unit="/5" onChange={(v) => set({ quality: v })} />
            </div>
            <Button variant="navy" className="mt-3 w-full justify-center" onClick={() => setSubmitted(draft)}><Send className="size-4" /> 데이터 전송</Button>
          </div>
        </aside>

        {/* RIGHT — detection result */}
        <div className="flex min-w-0 flex-col gap-3">
          {!submitted ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#dddde4] py-20 text-center">
              <NotebookPen className="size-6 text-icon" />
              <p className="text-sm text-dim">왼쪽에서 오늘 밤 데이터를 입력하고 <b className="text-ink">데이터 전송</b>을 누르세요.</p>
              <p className="max-w-sm text-xs leading-relaxed text-icon">시나리오 칩으로 "본인 기준 이상" 케이스를 바로 재현할 수 있습니다.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: "감지된 이상", v: findings.length, tone: findings.length ? "text-ink" : "text-[#4d6a0f]" },
                  { k: "환자 기준 이상 ★", v: within, tone: within ? "text-danger" : "text-dim" },
                  { k: "표준 EDC가 놓칠 건", v: findings.filter((f) => f.population_ok).length, tone: "text-info" },
                ].map((c) => <div key={c.k} className="rounded-2xl border border-[#eeeef4] bg-surface p-3"><p className="text-[11px] text-dim">{c.k}</p><p className={cn("mt-0.5 text-2xl font-bold tabular-nums", c.tone)}>{c.v}</p></div>)}
              </div>

              {findings.length === 0 ? (
                <div className="flex items-center gap-2 rounded-2xl border border-[#eeeef4] bg-surface p-4 text-sm text-[#4d6a0f]"><Check className="size-4" /> 규칙·본인 기준 모두 정상 — 조용히 통과시키지 않고 검토 완료로 기록됩니다.</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {findings.some((f) => f.severity === "Critical") && (
                    <div className="flex items-center gap-2 rounded-xl bg-[#fdecec] px-3 py-2 text-[11px] text-danger"><ShieldAlert className="size-4" /> Critical 포함 — 데이터 잠금 차단 사유. 원자료 대조 쿼리 권고.</div>
                  )}
                  {findings.map((f, i) => <FindingCard key={`${f.key}-${i}`} f={f} patient={patient.patient_id} />)}
                </div>
              )}

              <div className="mt-1 flex items-start gap-2 rounded-2xl bg-elevated p-3 text-[11px] leading-relaxed text-dim">
                <Activity className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>숫자·판정은 결정적 엔진(EC + 환자 내 z-score), AI는 설명만. <b className="text-ink">"환자 기준 이상 ★"</b>은 모집단 범위엔 들지만 그 환자 본인 분포(평소 ±)에선 벗어난 신호 — 표준 ePRO/EDC 범위검사로는 통과되는 영역입니다.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
