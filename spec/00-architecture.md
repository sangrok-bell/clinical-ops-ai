# 00 · 아키텍처 & 생성 컨트랙트 (AURORA)

이 문서는 AURORA 다크 대시보드 앱을 **결정론적으로 재생성**하기 위한 마스터 스펙이다. 모든 컴포넌트 스펙은 여기에 정의된 스택·파일 구조·네이밍·스타일 파이프라인을 따른다. 이 스펙은 **이미 빌드/렌더링이 검증된 코드에서 역산(reverse-derive)**되었다. 이름을 새로 발명하지 말고, 여기 적힌 canon만 사용한다.

> 토큰 정의는 [01-tokens.md](./01-tokens.md), 데이터 계약은 [02-data-contracts.md](./02-data-contracts.md), 컴포넌트별 스펙은 [components/](./components/)에 있다. 읽는 순서는 문서 맨 아래 "읽는 순서"를 참고.

---

## 1. 스택 & 정확한 버전

빌드 도구와 런타임은 아래 버전 범위로 고정한다 (`package.json` 기준).

| 영역 | 패키지 | 버전 |
| --- | --- | --- |
| 번들러 | `vite` | `^6.0.7` |
| React 플러그인 | `@vitejs/plugin-react` | `^4.3.4` |
| UI 런타임 | `react` / `react-dom` | `^18.3.1` |
| 언어 | `typescript` | `^5.7.3` |
| CSS | `tailwindcss` | `^4.0.0` |
| CSS 번들 통합 | `@tailwindcss/vite` | `^4.0.0` |
| 아이콘 | `lucide-react` | `^0.468.0` |
| 클래스 병합 | `clsx` | `^2.1.1` + `tailwind-merge` | `^2.6.0` |
| 변형(variant) | `class-variance-authority` (cva) | `^0.7.1` |
| 타입 | `@types/node` `^22.10.5`, `@types/react` `^18.3.18`, `@types/react-dom` `^18.3.5` | — |

`type` 은 `"module"` (ESM). 패키지명은 `aurora-hackathon-starter`.

### npm 스크립트 (정확히 이대로)

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -p tsconfig.json && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -p tsconfig.json"
}
```

핵심: `build`는 **타입체크(`tsc`)를 먼저 통과해야** Vite 빌드로 진행한다. 생성된 코드는 `strict` 모드를 통과해야 한다.

---

## 2. 처음부터 셋업하는 단계 (from-scratch)

1. **Vite react-ts 스캐폴드 생성**
   ```bash
   npm create vite@latest aurora-hackathon-starter -- --template react-ts
   cd aurora-hackathon-starter
   ```
2. **의존성 설치 (런타임 / 개발)**
   ```bash
   npm i class-variance-authority clsx lucide-react tailwind-merge
   npm i -D @tailwindcss/vite tailwindcss @types/node
   ```
3. **`@/` 별칭 + Tailwind 플러그인을 `vite.config.ts`에 등록** (아래 §3 참조). `@types/node`는 `fileURLToPath`/`URL`/`import.meta.url`을 타입 안전하게 쓰기 위해 필요.
4. **`tsconfig.json`에 path 별칭 추가** (아래 §3 참조).
5. **`src/index.css`를 토큰 파이프라인으로 교체** — `@import "tailwindcss";` + `:root` + `@theme inline` + base + gradient/glass 유틸 (아래 §5, 상세는 [01-tokens.md](./01-tokens.md)).
6. **`src/lib/utils.ts`에 `cn()` 작성** (아래 §6).
7. **`src/data.ts`에 타입 + mock 데이터 작성** ([02-data-contracts.md](./02-data-contracts.md)).
8. **`src/components/ui/`에 프리미티브, `src/components/`에 컴포지트 작성** (아래 §7, §8).
9. **`src/App.tsx` 셸 레이아웃, `src/main.tsx` 엔트리 작성** ([components/app-shell.md](./components/app-shell.md)).
10. **검증 루프**: `npm run build`가 통과해야 하고, 그 다음 `npm run dev`로 렌더 확인 (아래 §10).

---

## 3. 빌드 설정 (정확한 내용)

### `vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- Tailwind v4는 **별도 `postcss.config` / `tailwind.config.js`가 없다**. `@tailwindcss/vite` 플러그인 하나로 처리하며, 설정·토큰은 전부 `index.css`의 `@theme`에 산다.
- `@` 별칭은 `./src`를 가리킨다. 모든 내부 import는 `@/...` 형태를 사용한다 (상대경로 `../` 금지, §6 참조).

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

핵심 포인트:
- `"jsx": "react-jsx"` → JSX에 `import React`가 필요 없다.
- `"strict": true` → 모든 props 타입을 명시해야 한다.
- `"noUnusedLocals"`/`"noUnusedParameters"`는 `false` → 사용 안 한 변수가 빌드를 깨지 않는다 (해커톤 친화적). 그래도 깔끔하게 작성한다.
- `"allowImportingTsExtensions": true` + `"noEmit": true` → 타입체크 전용. 출력은 Vite가 담당.
- `"baseUrl"` + `"paths"`로 `@/*` 별칭이 타입 레벨에서도 해석된다 (Vite 별칭과 짝을 맞춰야 함).

---

## 4. 전체 파일 구조 (각 1줄 목적)

```
src/
  index.css                       # @import "tailwindcss"; :root + @theme 토큰; base; gradient/glass 유틸 — 단일 스타일 진입점
  main.tsx                        # 앱 엔트리: createRoot + <StrictMode><App/></StrictMode>
  App.tsx                         # 셸 레이아웃 (sidebar | content | floating toolbar) — 컴포지트를 조립
  data.ts                         # TS 타입(PillTone, TagTone, NavEntry, HistoryItem) + mock 배열(primaryNav, pagesNav, tags, history)
  lib/
    utils.ts                      # cn() — clsx + tailwind-merge 래퍼
  components/
    ui/                           # PRIMITIVES (재사용 빌딩블록, 데이터 의존 없음)
      button.tsx                  # Button — cva variant(brand/surface/ghost/outline) × size(md/sm/icon)
      badge.tsx                   # CountPill + Dot — 카운트 필(tone) + unread 점
      card.tsx                    # Card — 떠 있는 다크 패널
      media.tsx                   # Avatar + Thumbnail — 오프라인 그라디언트 이니셜 / 썸네일
      toast.tsx                   # Toast — variant(success/info/ghost)
      nav.tsx                     # NavItem + SectionLabel + Tab + IconButton — 사이드바/탭 빌딩블록
    Sidebar.tsx                   # COMPOSITE — Button + NavItem + SectionLabel + 태그 행 조립
    FloatingToolbar.tsx           # COMPOSITE — IconButton 레일 + 뱃지
    NotificationPanel.tsx         # COMPOSITE — Card + Tab + history 행(Avatar/Thumbnail)
    ToastStack.tsx                # COMPOSITE — 세 가지 Toast 상태
```

> 디렉터리 규칙: **프리미티브는 `components/ui/`** (소문자 kebab/단어 파일명), **컴포지트는 `components/`** (PascalCase 파일명). 자세한 분리 기준은 §7.

---

## 5. 스타일링 파이프라인 (가장 중요)

스타일은 **하나의 파일 `src/index.css`**에서 흐른다. 컴포넌트는 인라인 색·임의 hex를 쓰지 않고, 오직 토큰 유틸리티만 소비한다.

### 5.1 `index.css`의 4개 레이어

```css
@import "tailwindcss";   /* 1) Tailwind v4 전체 */

:root { … }              /* 2) shadcn 호환 시맨틱 변수 (--background, --primary, --ring …) */

@theme inline { … }      /* 3) Tailwind 유틸 토큰 생성 (--color-canvas → bg-canvas 등) */

/* 4) base 리셋 + .bg-*-gradient / .glass / @keyframes toast-in / .animate-toast-in */
```

- **레이어 2 (`:root`)** — shadcn CLI(`npx shadcn add`)로 추가하는 컴포넌트가 그대로 맞도록 시맨틱 변수를 깐다: `--background #2b3563`, `--foreground #f5f7ff`, `--card #1a2138`, `--primary #3fd0c9`(brand teal), `--accent #3fcf8e`(positive), `--destructive #f0556a`, `--border rgba(255,255,255,0.08)`, `--ring #3fd0c9`, `--radius 0.875rem` 등.
- **레이어 3 (`@theme inline`)** — 두 묶음:
  1. shadcn 별칭을 `:root` 변수에 매핑 (`--color-background: var(--background)` … → `bg-background`, `text-muted-foreground`, `border-border`, `ring-ring` 등 유틸 생성).
  2. **AURORA 고유 토큰**을 직접 정의해 Tailwind 유틸로 노출:
     - 서피스: `--color-canvas #2b3563`, `--color-surface #1a2138`, `--color-sidebar #161d33`, `--color-elevated #20294a` → `bg-canvas` / `bg-surface` / `bg-sidebar` / `bg-elevated`
     - 텍스트/아이콘: `--color-ink #f5f7ff`, `--color-dim #9aa6cd`, `--color-icon #97a8db`, `--color-onaccent #0b1020` → `text-ink` / `text-dim` / `text-icon` / `text-onaccent`
     - 시맨틱 액센트: `--color-brand #3fd0c9`, `--color-positive #3fcf8e`, `--color-info #4c7df0`, `--color-magenta #e85fb0`, `--color-danger #f0556a`, `--color-warning #f08a3c`, `--color-caution #f0c23c` → `bg-/text-/ring-/border-` 접두사로 사용
     - 반경: `--radius-card 20px`, `--radius-toast 16px`, `--radius-btn 14px`, `--radius-pill 9999px` → `rounded-card` / `rounded-toast` / `rounded-btn` / `rounded-pill`
     - 그림자: `--shadow-card`, `--shadow-soft`, `--shadow-glow-green`, `--shadow-glow-blue`, `--shadow-glow-teal` → `shadow-card` / `shadow-soft` / `shadow-glow-green` / `shadow-glow-blue` / `shadow-glow-teal`
     - 타입/모션: `--font-sans` (Inter 우선), `--ease-spring cubic-bezier(0.34,1.56,0.64,1)`
- **레이어 4 (커스텀 클래스)** — `@theme`로 표현 불가능한 그라디언트/글래스/애니메이션은 일반 CSS 클래스로 정의:
  - `.bg-brand-gradient` — `linear-gradient(90deg, #2f6fe0 → #1fa9a2 → #1fa86e)` (라벨 대비 AA 확보용으로 어둡게 조정됨)
  - `.bg-success-gradient` — `linear-gradient(135deg, #2bbe6e → #25a862)`
  - `.bg-info-gradient` — `linear-gradient(135deg, #5c84f2 → #6e8df5)`
  - `.bg-logo-sphere` — `radial-gradient(circle at 30% 25%, #f08a3c → #e85fb0 → #3fd0c9)`
  - `.glass` — `rgba(255,255,255,0.06)` + `backdrop-filter: blur(20px)`
  - `@keyframes toast-in` (opacity + translateY) + `.animate-toast-in` (0.32s `--ease-spring`)
- **base**: `* { border-color: var(--border) }`, `html,body,#root { height:100% }`, `body`에 다크 배경/`--font-sans`/안티앨리어싱.

### 5.2 컴포넌트가 토큰을 소비하는 방법

- 컴포넌트는 **닫힌(closed) 토큰 유틸 집합**만 색·반경·그림자·그라디언트에 사용한다. 위 §5.1과 [01-tokens.md](./01-tokens.md)에 정의된 이름이 전부다. 임의 hex / 임의 Tailwind 색(`bg-slate-800` 등) 금지.
- 레이아웃용 제네릭 Tailwind 유틸(`flex`, `gap-*`, `p-*`, `size-*`, `min-w-*`, `items-*` 등)은 허용되지만 **디자인 토큰이 아니다** — 의미(색/상태)에 쓰지 말 것.
- 컬러는 **상태(status)만** 전달하며 항상 색이 아닌 백업(텍스트/아이콘/ring/언더라인)을 동반한다. 채도 높은 fill 위 텍스트는 흰색이 아니라 어두운 텍스트(`text-onaccent` 또는 컴포넌트 내장 fg)를 쓴다.
- 모든 인터랙티브 요소는 `focus-visible:ring-2 focus-visible:ring-brand`를 가진다.

---

## 6. 네이밍 / import / export 컨벤션

- **`cn()` 유틸** — `src/lib/utils.ts`:
  ```ts
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
  모든 컴포넌트의 `className`은 `cn(base, conditional, props.className)`로 병합한다.
- **import 경로**: 내부 모듈은 항상 `@/` 별칭 사용 — 예: `import { cn } from "@/lib/utils";`, `import { Button } from "@/components/ui/button";`. 상대경로(`../../`) 금지.
- **아이콘**: `lucide-react`에서 명명 import — `import { Bell, Search } from "lucide-react";`. 데이터에서 아이콘을 다룰 땐 타입 `LucideIcon`을 쓴다.
- **export**:
  - 프리미티브(`components/ui/*`)는 **named export** — 한 파일에서 관련 심볼 묶음을 export (예: `nav.tsx` → `NavItem`, `SectionLabel`, `Tab`, `IconButton`; `badge.tsx` → `CountPill`, `Dot`; `media.tsx` → `Avatar`, `Thumbnail`).
  - 컴포지트(`components/*.tsx`)는 **named export** (파일명 = 컴포넌트명).
  - `App.tsx`만 **default export** (main.tsx가 `import App from "@/App"`).
- **파일명**: 프리미티브 파일은 소문자(`button.tsx`), 컴포지트 파일은 PascalCase(`Sidebar.tsx`). 스펙 파일은 kebab(`spec/components/button.md`).
- **컴포넌트 props**: 함수 컴포넌트 + 명시적 props 타입. variant가 있는 프리미티브는 **cva**로 정의하고 `VariantProps<typeof xxxVariants>`를 props에 합성.

---

## 7. 프리미티브 vs 컴포지트 분리

| 구분 | 위치 | 특징 | 예 |
| --- | --- | --- | --- |
| **프리미티브** | `components/ui/` | 무상태에 가깝고, **데이터(data.ts) 의존 없음**, cva variant로 외형만 제어, 재사용 단위 | `Button`, `CountPill`/`Dot`, `Card`, `Avatar`/`Thumbnail`, `Toast`, `NavItem`/`SectionLabel`/`Tab`/`IconButton` |
| **컴포지트** | `components/` | 프리미티브를 **조립**하고 `data.ts`의 배열을 **소비/매핑**해 화면 한 영역을 구성 | `Sidebar`, `FloatingToolbar`, `NotificationPanel`, `ToastStack` |

규칙:
- 프리미티브는 **다른 프리미티브를 import해도 되지만** data.ts를 import하지 않는다.
- 컴포지트는 프리미티브를 조립하고, 자신이 그리는 데이터 배열을 `data.ts`에서 import한다. 컴포지트가 다른 컴포넌트를 조립하면 그 컴포넌트 스펙으로 링크한다 (예: [NotificationPanel](./components/notification-panel.md)은 [Card](./components/card.md) + [Tab](./components/nav.md) + [Avatar/Thumbnail](./components/media.md)을 조립).
- 컴포넌트 inventory와 스펙 매핑:

| 이름 | 파일 | 스펙 |
| --- | --- | --- |
| `Button` | `components/ui/button.tsx` | [button.md](./components/button.md) |
| `CountPill`, `Dot` | `components/ui/badge.tsx` | [badge.md](./components/badge.md) |
| `Card` | `components/ui/card.tsx` | [card.md](./components/card.md) |
| `Avatar`, `Thumbnail` | `components/ui/media.tsx` | [media.md](./components/media.md) |
| `Toast` | `components/ui/toast.tsx` | [toast.md](./components/toast.md) |
| `NavItem`, `SectionLabel`, `Tab`, `IconButton` | `components/ui/nav.tsx` | [nav.md](./components/nav.md) |
| `Sidebar` | `components/Sidebar.tsx` | [sidebar.md](./components/sidebar.md) |
| `FloatingToolbar` | `components/FloatingToolbar.tsx` | [floating-toolbar.md](./components/floating-toolbar.md) |
| `NotificationPanel` | `components/NotificationPanel.tsx` | [notification-panel.md](./components/notification-panel.md) |
| `ToastStack` | `components/ToastStack.tsx` | [toast-stack.md](./components/toast-stack.md) |
| `App` (shell) | `App.tsx` | [app-shell.md](./components/app-shell.md) |

---

## 8. 데이터 흐름 (data.ts → 컴포넌트)

- **단일 소스 `src/data.ts`**가 타입과 mock 데이터를 모두 export한다. 자세한 계약은 [02-data-contracts.md](./02-data-contracts.md).
- 타입: `PillTone = "positive" | "magenta" | "danger"`, `TagTone = "danger" | "warning" | "caution" | "positive"`, `NavEntry`, `HistoryItem`.
- 배열: `primaryNav`, `pagesNav`(둘 다 `NavEntry[]`), `tags`, `history`(`HistoryItem[]`).
- 흐름: **컴포지트만** 데이터를 import한다. `Sidebar`는 `primaryNav`/`pagesNav`/`tags`를 매핑해 `NavItem`·태그 행으로 렌더, `NotificationPanel`은 `history`를 매핑해 history 행(trailing이 `thumb`면 `Thumbnail`, `avatar`면 `Avatar`)으로 렌더. 프리미티브는 props만 받는다 (단방향).
- 토큰 매핑: 데이터의 `tone`/`type` 값이 컴포넌트 안에서 토큰 유틸로 번역된다 (예: `PillTone "positive"` → `bg-positive` 계열). 이 매핑 테이블은 각 프리미티브 스펙(예: [badge.md](./components/badge.md))에 명시.

---

## 9. 엔트리포인트

### `src/main.tsx` (정확히 이대로)

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import App from "@/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- `@/index.css`를 여기서 한 번만 import → 전역 토큰/스타일이 로드된다.
- `App`은 default import. `App.tsx`는 셸 레이아웃(sidebar | content | floating toolbar)을 그린다 — [app-shell.md](./components/app-shell.md).
- `index.html`의 마운트 노드는 `#root`.

---

## 10. 빌드 / 검증 루프

생성 직후 아래 순서로 검증한다 (반드시 통과해야 "완료"):

1. **타입체크 + 빌드** — `npm run build`
   - 내부적으로 `tsc -p tsconfig.json` (strict 타입체크) → 통과 시 `vite build`.
   - 실패 시: 누락 props / 잘못된 import 별칭 / 존재하지 않는 토큰 유틸을 먼저 의심.
2. **개발 서버 렌더 확인** — `npm run dev` 후 화면 확인.
   - 다크 캔버스(`bg-canvas`) 위에 sidebar / NotificationPanel / FloatingToolbar / ToastStack이 보이고, 토큰 색·반경·그림자·그라디언트가 적용됐는지 확인.
3. (선택) **타입만 빠르게** — `npm run typecheck`, **정적 미리보기** — `npm run preview`.

결정론 원칙: 새 토큰/이름을 발명하지 말 것. 빌드가 깨지면 코드를 토큰 계약(§5, [01-tokens.md](./01-tokens.md))과 데이터 계약([02-data-contracts.md](./02-data-contracts.md))에 맞춘다.

---

## 읽는 순서

1. [README.md](./README.md) — 스펙 스위트 개요
2. **00-architecture.md** (이 문서) — 스택·셋업·파일 구조·스타일 파이프라인·검증 루프
3. [01-tokens.md](./01-tokens.md) — 디자인 토큰(서피스/텍스트/액센트/반경/그림자/그라디언트/모션) 닫힌 집합
4. [02-data-contracts.md](./02-data-contracts.md) — `data.ts` 타입 + mock 배열 계약
5. 프리미티브: [button.md](./components/button.md) · [badge.md](./components/badge.md) · [card.md](./components/card.md) · [media.md](./components/media.md) · [toast.md](./components/toast.md) · [nav.md](./components/nav.md)
6. 컴포지트: [sidebar.md](./components/sidebar.md) · [floating-toolbar.md](./components/floating-toolbar.md) · [notification-panel.md](./components/notification-panel.md) · [toast-stack.md](./components/toast-stack.md)
7. 셸: [app-shell.md](./components/app-shell.md)
