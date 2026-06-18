# Aurora CONTRACT — 불변 backbone

모든 명세·생성 코드가 **반드시** 지키는 canon. 새 토큰/컴포넌트가 필요하면 **여기 먼저 등록**한 뒤
`src/index.css`(토큰)·소스(컴포넌트)·해당 스펙을 갱신한다. 추측 금지: 여기 없는 이름은 쓰지 않는다.

> **현재 테마: Harmonic (라이트·임상 신뢰)** — 회사 실제 시스템(`dw-poc-report/planning/DESIGN-SYSTEM.md`) 채택.
> 토큰 *이름*은 고정, *값*만 테마가 정한다. 값의 SoT = `src/index.css` `@theme`. 핵심: Medical White `#FBFBFC` 배경 ·
> Black `#1C1C1A` 텍스트 · 남색 `#08264A`(brand 앵커) · 라임 `#C8E64A`(positive/CTA) · **그림자 대신 보더** · **그레이스케일 우선**.

## 스택 (고정)
Vite 6 · React 18 · TypeScript 5 · Tailwind CSS v4 (`@tailwindcss/vite`). alias `@/` → `src/`.
아이콘 `lucide-react` · 클래스 병합 `cn()`(clsx+tailwind-merge) · variants `class-variance-authority`(cva).

## 파일 구조 (생성 타깃)
```
src/
  index.css            # @import "tailwindcss"; @theme {tokens}; base; gradient/glass classes
  lib/utils.ts         # cn()
  types.ts             # PillTone, ToastVariant, TagTone (공유 enum)
  data.ts              # NavEntry, HistoryItem + mock 배열 (primaryNav, pagesNav, tags, history)
  components/ui/       # 프리미티브: button badge card media toast nav
  components/          # 컴포지트: Sidebar FloatingToolbar NotificationPanel ToastStack
  App.tsx              # 셸 레이아웃 (sidebar | content | floating toolbar)
  main.tsx
```

## 디자인 토큰 (닫힌 집합 — 디자인 값은 이것만 참조)
- **Surfaces:** `bg-canvas` `bg-surface` `bg-sidebar` `bg-elevated`
- **Text:** `text-ink`(primary) `text-dim`(secondary) `text-icon` `text-onaccent`(채도 위 dark)
- **Accents** (`bg-`/`text-`/`ring-`/`border-`/`ring-offset-`): `brand` `positive` `info` `magenta` `danger` `warning` `caution`
- **Radii:** `rounded-card`(16) `rounded-toast`(12) `rounded-btn`(12) `rounded-pill`(full)
- **Elevation:** `shadow-card` `shadow-soft` `shadow-glow-green` `shadow-glow-blue` `shadow-glow-teal`
- **Gradient/Glass:** `bg-brand-gradient` `bg-success-gradient` `bg-info-gradient` `bg-logo-sphere` `glass`
- **Motion:** `animate-toast-in`
- **shadcn 별칭:** `bg-background` `bg-card` `bg-primary` `text-muted-foreground` `border-border` `ring-ring` …
- generic 레이아웃 유틸(flex/gap-*/p-*/size-*)은 허용되나 **디자인 토큰이 아님**.
- 전체 값/역할은 [01-tokens.md](./01-tokens.md), 정의 원본은 `src/index.css` `@theme`.

## 컴포넌트 인벤토리 (canonical name → file → spec)
| Export | File | Spec |
|---|---|---|
| `Button`, `buttonVariants` | `components/ui/button.tsx` | [button.md](./components/button.md) |
| `CountPill`, `Dot` | `components/ui/badge.tsx` | [badge.md](./components/badge.md) |
| `Card` | `components/ui/card.tsx` | [card.md](./components/card.md) |
| `Avatar`, `Thumbnail` | `components/ui/media.tsx` | [media.md](./components/media.md) |
| `Toast` | `components/ui/toast.tsx` | [toast.md](./components/toast.md) |
| `NavItem`, `SectionLabel`, `Tab`, `IconButton` | `components/ui/nav.tsx` | [nav.md](./components/nav.md) |
| `Sidebar` | `components/Sidebar.tsx` | [sidebar.md](./components/sidebar.md) |
| `FloatingToolbar` | `components/FloatingToolbar.tsx` | [floating-toolbar.md](./components/floating-toolbar.md) |
| `NotificationPanel` | `components/NotificationPanel.tsx` | [notification-panel.md](./components/notification-panel.md) |
| `ToastStack` | `components/ToastStack.tsx` | [toast-stack.md](./components/toast-stack.md) |
| `App` (default) | `App.tsx` | [app-shell.md](./components/app-shell.md) |

## 데이터 계약 (`types.ts` / `data.ts`)
- `type PillTone = "positive" | "magenta" | "danger"`
- `type ToastVariant = "success" | "info" | "ghost"`
- `type TagTone = "danger" | "warning" | "caution" | "positive"`
- `type NavEntry = { icon: LucideIcon; label: string; count?: number; tone?: PillTone; active?: boolean }`
- `type HistoryItem = { actor; time; verb; primary; connector; secondary; trailing: {type:"thumb",seed} | {type:"avatar",name} }`
- 배열: `primaryNav`, `pagesNav`, `tags`, `history` — 전체는 [02-data-contracts.md](./02-data-contracts.md).

## 컨벤션
- 함수형 컴포넌트. 프리미티브는 named export, `App`만 default.
- import는 `@/` alias. 스타일은 `cn()` + 토큰 유틸리티만(문서화된 arbitrary 값 예외 제외).
- **Light-first**: 밝은 표면(흰/Cool White) 위 어두운 텍스트(`#1C1C1A`). **그레이스케일 우선** — 색은 이유 있을 때만.
  **색=상태**일 땐 항상 비-색상 보조(텍스트/아이콘/링/밑줄). 라임/옵틱옐로 위 텍스트는 `text-onaccent`(어두움). **남색+라임 그라데이션 혼합 금지**.
- **그림자 대신 보더**: 카드/구분은 1px `#EEEEF4` 보더. 그림자는 floating 요소(툴팁/패널)에만.
- **그라데이션 용도 구분**: 라임 그라데이션(`bg-brand-gradient` = `#C8E64A→#7BAF1A` 135°)은 **활성 사이드바 nav · 퍼널 마지막 단계 · 사용률 숫자** 전용. **Primary CTA 버튼은 솔리드 라임(`bg-positive`)** 이다(그라데이션 아님).
- **데이터 시각화 = 그레이스케일 우선**: 의도적 구분이 필요 없으면 무채색(`#1C1C1A`~`#D4D4DC`)으로. 색은 이유가 있을 때만. **긍정/개선 = 남색(`brand`/`#08264A`)으로 시각적 무게, 부정/악화 = 회색**으로 존재감↓.
- **확장 보조 토큰**(데이터/대시보드용): `caption`(#9B9BA3) `line`(#DDDDE4) `muted-strong`(#B8B8C2) `faint`(#F4F4F8) `success`(#2E7D32) `male`(#5B9BD5) `female`(#F4A6B8) `line-soft`(#D4D4DC). 사이드바 폭 240/64.
- 모든 인터랙티브 요소: `focus-visible:ring-2 focus-visible:ring-brand`.

## 교차링크 규약 (긴밀 결합)
- 컴포넌트 스펙은 `spec/components/<kebab>.md`. 형제 컴포넌트는 상대링크 `[Button](./button.md)`로 연결.
- 토큰은 코드체로 표기(예: `` `bg-positive` ``)하고 [01-tokens.md] 참조. 데이터 타입은 [02-data-contracts.md] 링크.
- composition·데이터 소비는 **반드시 링크**한다. 무결성은 `npm run eval`이 검사.
