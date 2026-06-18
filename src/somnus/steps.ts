import { FileSearch, ShieldCheck, Smartphone, LayoutDashboard, ClipboardList, Lock } from "lucide-react";
import type { Step, StepId, Gates } from "./types";

// NOTE: STEPS labels are a SEPARATE constant from SetupShell's STEP_NAMES — do not unify
// (Stepper.test depends on these; the screen stepper depends on STEP_NAMES). spec/14.4.
// desc preserves the original mockup's 6-layer naming (L4 메타 etc.); the live engine's
// layer semantics are per spec/05 — this copy is a deliberate mockup remnant.
export const STEPS: Step[] = [
  { id: "protocol", n: 1, label: "프로토콜·SOP 검토", sub: "ePRO·EDC 설계", icon: FileSearch, desc: "프로토콜·SOP를 업로드하면 운영 위험을 점검하고, 환자 자가보고(ePRO) 항목과 EDC 스키마를 자동 추출합니다." },
  { id: "rules", n: 2, label: "검증·탐지 규칙", sub: "6계층 규칙 생성", icon: ShieldCheck, desc: "추출된 규칙을 6계층(L1 범위 · L2 교차폼 · L3 삼각 · L4 메타 · L5 코호트 · L6 개인)으로 검토·승인하면 검증 엔진이 활성화됩니다." },
  { id: "collect", n: 3, label: "데이터 수집", sub: "환자 ePRO 앱", icon: Smartphone, desc: "환자 ePRO 앱으로 수면 데이터를 수집하며, 입력 즉시 6계층 검증으로 오입력·안전신호를 잡아냅니다." },
  { id: "monitor", n: 4, label: "모니터링", sub: "대시보드·알림", icon: LayoutDashboard, desc: "QTL 모니터링 · 계층별 탐지 · 알림 센터로 데이터 정합성과 효능 신호를 실시간 추적합니다." },
  { id: "review", n: 5, label: "데이터 리뷰", sub: "쿼리·감사추적", icon: ClipboardList, desc: "쿼리 관리 + 다중소스 불일치 검토 + 완전한 감사추적(21 CFR Part 11)." },
  { id: "lock", n: 6, label: "DB Lock", sub: "데이터베이스 락", icon: Lock, desc: "전수 6계층 재검증 → 미해결 쿼리 0 + QTL 충족이면 데이터베이스를 락하고 분석 데이터셋을 확정합니다." },
];

// Which gate flag each gating step sets when completed (terminal steps set none).
export const GATE_OF: Partial<Record<StepId, keyof Gates>> = {
  protocol: "step1Done",
  rules: "enginesLive",
  collect: "dataCollected",
};

// The step a "complete" action advances to.
export const NEXT_OF: Partial<Record<StepId, StepId>> = {
  protocol: "rules",
  rules: "collect",
  collect: "monitor",
};
