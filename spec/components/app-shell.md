# App (shell)

## 1. Purpose
앱 전체 셸 레이아웃. 좌측 [Sidebar](./sidebar.md), 중앙 콘텐츠([NotificationPanel](./notification-panel.md) + [ToastStack](./toast-stack.md)), 우측 [FloatingToolbar](./floating-toolbar.md)를 가로 3분할로 조립하는 최상위 루트 컴포넌트다.

## 2. File path + exports
- **File:** `src/App.tsx`
- **Exports:**
  - `App` — `export default function App()` 컴포넌트 (**default export 유일**, `main.tsx`가 `import App from "@/App"`로 가져옴, see [../00-architecture.md](../00-architecture.md))
- props/named export 없음.

## 3. Props
`App`은 props를 받지 않는다(`function App()`, 인자 없음). 모든 데이터는 자식 컴포지트가 `data.ts`에서 직접 import해 그린다(see [../02-data-contracts.md](../02-data-contracts.md)). 따라서 props 인터페이스가 없다.

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| — | — | — | — | props 없음. 셸은 상태/입력을 받지 않는 정적 레이아웃 컨테이너다. |

## 4. Variants & states
`App`은 variant/state 시스템이 없는 레이아웃 컴포넌트다. 인터랙티브 상태(hover/active/focus-visible/disabled)는 모두 자식 프리미티브([Button](./button.md), [nav.md](./nav.md)의 `NavItem`/`IconButton`/`Tab` 등)가 자체 처리한다. 셸 레벨에서 유일하게 분기하는 것은 **반응형 표시 여부**다.

| 분기 | 클래스 | 동작 |
| --- | --- | --- |
| 우측 툴바 컨테이너 | `hidden ... lg:flex` | 기본은 `hidden`, `lg`(≥1024px) 이상에서만 [FloatingToolbar](./floating-toolbar.md) 노출 |
| 콘텐츠 영역 | `overflow-y-auto` | 콘텐츠가 길어지면 `<main>`만 세로 스크롤(사이드바/툴바는 고정) |
| 콘텐츠 폭 | `max-w-[460px]` | 중앙 칼럼 최대 폭 고정, `justify-center`로 중앙 정렬 |

## 5. Design tokens used
모든 토큰 값/정의는 [../01-tokens.md](../01-tokens.md) 참조. 셸 본문에서 직접 쓰는 Aurora 캐노니컬 토큰은 다음 2개뿐이며, 나머지(`flex`/`h-full`/`min-h-screen`/`flex-1`/`items-start`/`justify-center`/`overflow-y-auto`/`px-10`/`py-10`/`w-full`/`max-w-[460px]`/`flex-col`/`gap-7`/`hidden`/`shrink-0`/`pr-8`/`pt-10`/`lg:flex`)는 일반 레이아웃 유틸로 토큰이 아니다.

| Token | 적용 위치 |
| --- | --- |
| `bg-canvas` | 루트 `<div>` 전체 배경 — 앱의 가장 어두운 베이스 서피스(see [../01-tokens.md](../01-tokens.md)). |
| `text-ink` | 루트 `<div>`의 기본 텍스트 색 상속 기준점 — 자식들이 별도 색을 주지 않으면 이 primary ink를 물려받는다. |

> 서피스 위계(`bg-canvas` < `bg-sidebar`/`bg-surface` < `bg-elevated`)에서 셸은 최하단 `bg-canvas`만 깐다. 그 위에 [Sidebar](./sidebar.md)가 `bg-sidebar`, [Card](./card.md)가 `bg-surface`로 떠 보이도록 의도된 레이어링이다.

## 6. Composition
**렌더하는 컴포넌트** (모두 named import, `@/components/*`):

| 컴포넌트 | import 경로 | 위치 | spec |
| --- | --- | --- | --- |
| `Sidebar` | `@/components/Sidebar` | 좌측 고정 레일 | [sidebar.md](./sidebar.md) |
| `NotificationPanel` | `@/components/NotificationPanel` | 중앙 `<main>` 상단 | [notification-panel.md](./notification-panel.md) |
| `ToastStack` | `@/components/ToastStack` | 중앙 `<main>` 하단 | [toast-stack.md](./toast-stack.md) |
| `FloatingToolbar` | `@/components/FloatingToolbar` | 우측 (`lg:flex`에서만) | [floating-toolbar.md](./floating-toolbar.md) |

- **소비하는 데이터 타입:** 없음. `App` 자신은 `data.ts`의 타입(`NavEntry`, `HistoryItem`, `PillTone`, `TagTone` 등)을 import하지 않는다 — 데이터는 각 컴포지트 내부에서 소비된다(see [../02-data-contracts.md](../02-data-contracts.md)).
- **렌더 순서/구조:** `<div bg-canvas text-ink>` → `Sidebar` / `<main>`(`NotificationPanel` + `ToastStack`을 `gap-7` 세로 스택) / `<div lg:flex>`(`FloatingToolbar`) 순서로 가로 배치.

## 7. Accessibility
- **랜드마크:** 중앙 콘텐츠를 `<main>` 시맨틱 태그로 감싸 스크린리더 본문 랜드마크를 제공한다. 좌/우 레일은 자식 컴포넌트([Sidebar](./sidebar.md), [FloatingToolbar](./floating-toolbar.md))가 `<nav>`/`<aside>` 등 자체 시맨틱을 책임진다.
- **Focus ring:** 셸 자체엔 포커서블 요소가 없다. 포커스 가시성은 모든 자식 인터랙티브 요소가 `focus-visible:ring-2 focus-visible:ring-brand`로 처리(전역 규칙, see [../01-tokens.md](../01-tokens.md)).
- **Color-is-not-the-only-signal:** 셸은 색으로 의미를 전달하지 않는다(`bg-canvas`는 순수 배경). 상태색은 전부 자식 배지/토스트에서 형태·텍스트 백업과 함께 쓰인다.
- **스크롤/히트 영역:** `overflow-y-auto`가 `<main>`에만 걸려 키보드 스크롤 가능. `max-w-[460px]`로 콘텐츠 폭을 제한해 가독성을 확보한다.
- **반응형 숨김:** `lg` 미만에서 [FloatingToolbar](./floating-toolbar.md)는 `hidden`으로 DOM에서 제거되지 않고 표시만 꺼진다 — 동일 액션이 작은 화면에서도 접근 가능해야 한다면 사이드바 등 대체 경로를 둘 것.

## 8. Usage example
`App`은 앱 최상위라 보통 `main.tsx`에서 한 번만 마운트한다.

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import App from "@/App"; // default import

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

```tsx
// src/App.tsx — 셸 레이아웃 그대로
import { Sidebar } from "@/components/Sidebar";
import { FloatingToolbar } from "@/components/FloatingToolbar";
import { NotificationPanel } from "@/components/NotificationPanel";
import { ToastStack } from "@/components/ToastStack";

export default function App() {
  return (
    <div className="flex h-full min-h-screen bg-canvas text-ink">
      <Sidebar />

      {/* content */}
      <main className="flex flex-1 items-start justify-center overflow-y-auto px-10 py-10">
        <div className="flex w-full max-w-[460px] flex-col gap-7">
          <NotificationPanel />
          <ToastStack />
        </div>
      </main>

      {/* right floating toolbar */}
      <div className="hidden shrink-0 items-start pr-8 pt-10 lg:flex">
        <FloatingToolbar />
      </div>
    </div>
  );
}
```

## 9. Generation notes
- **`App.tsx`만 default export.** 셸 컴포넌트는 `export default function App()`이며, `main.tsx`는 `import App from "@/App"`(중괄호 없음)로 가져온다. 다른 모든 컴포넌트는 named export라는 점과 헷갈리지 말 것(see [../00-architecture.md](../00-architecture.md)).
- **자식 4개는 전부 named import.** `import { Sidebar } from "@/components/Sidebar"` 식. 컴포지트 파일은 `src/components/`(대문자 PascalCase 파일명), 프리미티브는 `src/components/ui/`(소문자)로 경로가 다르다.
- **`@/` alias 필수.** `tsconfig` + `@tailwindcss/vite`의 `@/` → `src/` 매핑이 동작해야 import가 풀린다. 상대경로로 바꾸지 말 것.
- **높이 체인 `h-full min-h-screen`.** 루트가 화면을 가득 채우려면 `html, body, #root`에 `h-full`(또는 `height: 100%`)이 `index.css` base에 있어야 한다 — 없으면 `h-full`이 0으로 붕괴. `min-h-screen`은 콘텐츠가 짧아도 배경이 화면 전체를 덮게 하는 백업.
- **스크롤은 `<main>`에만.** `overflow-y-auto`가 콘텐츠 칼럼에만 걸려 사이드바/툴바는 스크롤되지 않는다. 루트 `<div>`에 `overflow`를 추가하면 고정 레일이 같이 흐르니 주의.
- **우측 툴바 래퍼는 셸이 소유.** `hidden ... lg:flex`와 `pr-8 pt-10`은 [FloatingToolbar](./floating-toolbar.md) 내부가 아니라 셸의 래퍼 `<div>`에 있다. 반응형 숨김/여백을 바꾸려면 이 래퍼를 수정.
- **`max-w-[460px]` 중앙 칼럼.** 콘텐츠 폭 상한이 이 값으로 고정돼 있고, [ToastStack](./toast-stack.md)도 내부에서 동일하게 `max-w-[460px]`를 갖는다 — 둘을 동시에 바꿔야 정렬이 어긋나지 않는다.
- **주석 보존 권장.** `{/* content */}`, `{/* right floating toolbar */}` 주석은 셸 영역 구분 표식이라 그대로 두면 가독성이 좋다(빌드엔 무관).
