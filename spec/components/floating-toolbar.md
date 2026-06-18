# FloatingToolbar

## 1. Purpose
오른쪽 가장자리에 떠 있는 glass 스타일 아이콘 레일(rail)로, 알림/설정/트렌딩/업로드/추가 같은 전역 액션을 세로로 배치하고 unread `Dot`과 카운트 배지로 상태를 알린다.

## 2. File path + exports
- File: `src/components/FloatingToolbar.tsx`
- Exports:
  - `FloatingToolbar` (named, function component)

## 3. Props
이 컴포넌트는 props를 받지 않는다. 아이콘 5개와 라벨, 배지가 모두 소스에 하드코딩되어 있다.

| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| — | — | — | — | 받는 props 없음. `FloatingToolbar()` 시그니처는 매개변수가 없다. |

## 4. Variants & states
이 컴포넌트 자체에는 variant prop이 없다. 내부 버튼은 두 가지 형태로 나뉜다.

- **알림 버튼 (첫 번째)**: `glass` + `size-12` + `shadow-soft`로 강조된 떠 있는 버튼. 오른쪽 위에 [`Dot`](./badge.md) unread 표시.
- **나머지 버튼 4개 (Settings / Trending / Uploads / Add)**: `size-10`, 배경 없는 ghost 형태.

각 버튼 상태:

| state | 적용 |
| --- | --- |
| default | `text-icon` (저대비 아이콘 색). `bg-` 없음(알림 버튼만 `glass`). |
| hover | `hover:text-ink`로 아이콘을 주 텍스트 색까지 밝힘 (`transition-colors`). |
| active | 별도 active 스타일 없음 (네이티브 `<button>` 기본 동작). |
| focus-visible | `outline-none focus-visible:ring-2 focus-visible:ring-brand` — 모든 버튼 공통. |
| disabled | `disabled` 처리 없음 (모든 버튼 항상 활성). |
| badge (Uploads) | `bg-danger` + `text-onaccent` 카운트 칩(`9`), `ring-2 ring-canvas`로 배경과 분리. |

## 5. Design tokens used
모든 토큰은 [`../01-tokens.md`](../01-tokens.md) 참조.

| token utility | 적용 위치 |
| --- | --- |
| [`glass`](../01-tokens.md) | 첫 번째 알림 버튼의 떠 있는 유리 표면 |
| [`shadow-soft`](../01-tokens.md) | 알림 버튼의 부드러운 그림자 |
| [`rounded-full`](../01-tokens.md) | 모든 버튼과 카운트 칩의 완전한 원형 |
| [`text-icon`](../01-tokens.md) | 모든 아이콘의 기본(저대비) 색 |
| [`text-ink`](../01-tokens.md) | hover 시 아이콘 색 (`hover:text-ink`) |
| [`ring-brand`](../01-tokens.md) | 모든 버튼의 `focus-visible:ring-brand` 포커스 링 |
| [`bg-danger`](../01-tokens.md) | Uploads 카운트 칩 배경 |
| [`text-onaccent`](../01-tokens.md) | Uploads 카운트 칩의 다크 텍스트(채도 높은 fill 위) |
| [`ring-canvas`](../01-tokens.md) | Uploads 칩을 캔버스 색 링으로 분리(`ring-2 ring-canvas`) |
| [`bg-magenta`](../01-tokens.md) | 알림 버튼의 unread [`Dot`](./badge.md)이 내부적으로 사용 |

레이아웃 전용 유틸(`flex`, `flex-col`, `items-center`, `gap-5`, `py-2`, `size-12`, `size-10`, `size-5`, `relative`, `absolute`, `h-4`, `min-w-4`, `px-1`, `text-[10px]`, `font-bold`)은 디자인 토큰이 아니며 그대로 둔다.

## 6. Composition
- 렌더링하는 컴포넌트:
  - [`Dot`](./badge.md) — `@/components/ui/badge`에서 import. 알림 버튼 위 unread 표시(`absolute right-3 top-3`).
- 아이콘: `lucide-react`의 `Bell`, `Settings`, `Flame`, `Cloud`, `Plus` (모두 `className="size-5"`).
- 소비하는 데이터 타입: 없음. 이 컴포넌트는 [`../02-data-contracts.md`](../02-data-contracts.md)의 어떤 타입도 받지 않으며, 모든 항목이 인라인 하드코딩이다.
- 참고: Uploads 카운트 칩은 [`CountPill`](./badge.md)을 쓰지 않고 인라인 `<span>`으로 구현된다(검증된 소스 그대로).

## 7. Accessibility
- 모든 버튼은 `type="button"`으로 폼 제출을 방지한다.
- 각 버튼에 의미 있는 `aria-label` 제공: `"Notifications, new"`, `"Settings"`, `"Trending"`, `"Uploads, 9 pending"`, `"Add"`. 아이콘 전용 버튼이므로 라벨이 필수.
- [`Dot`](./badge.md)은 시각적 unread 신호일 뿐이라 부모 버튼의 `aria-label`("…, new")이 그 의미를 텍스트로 보강한다 (color-is-not-the-only-signal).
- Uploads 카운트(`9`)는 색(`bg-danger`)뿐 아니라 숫자 텍스트와 `aria-label`("9 pending")로 의미를 전달한다.
- 포커스: 모든 버튼이 `outline-none focus-visible:ring-2 focus-visible:ring-brand`로 키보드 포커스 링을 보장.
- 히트 영역: 알림 버튼 `size-12`(48px), 나머지 `size-10`(40px)로 충분한 클릭 타겟 확보.

## 8. Usage example
```tsx
import { FloatingToolbar } from "@/components/FloatingToolbar";

export default function Demo() {
  return (
    <div className="flex min-h-screen items-center justify-end bg-canvas pr-4">
      <FloatingToolbar />
    </div>
  );
}
```

## 9. Generation notes
- props가 전혀 없는 무상태 컴포넌트다. 호출부에서 어떤 값도 넘기지 말 것: `<FloatingToolbar />`.
- `Dot`는 named export이므로 `import { Dot } from "@/components/ui/badge";`로 가져온다. default import 아님.
- 첫 번째(알림) 버튼만 `glass` + `size-12` + `shadow-soft`이고, 나머지 4개는 `size-10`에 배경이 없다. 이 비대칭을 그대로 유지해야 시각적 위계가 맞는다.
- Uploads 배지는 [`CountPill`](./badge.md)이 아니라 인라인 `<span>`이다. `bg-danger text-onaccent ring-2 ring-canvas`와 `-right-1 -top-1` 오프셋, `text-[10px]`를 그대로 써야 한다. 임의로 `CountPill`로 치환하면 위치/크기가 달라진다.
- `Dot`은 `bg-magenta`(badge.tsx 내부)라서 빨강이 아니다. 위치는 `absolute right-3 top-3`.
- 모든 토큰(`glass`, `shadow-soft`, `bg-danger`, `text-onaccent`, `ring-canvas`, `ring-brand`, `text-icon`, `text-ink`)은 [`../01-tokens.md`](../01-tokens.md)의 `@theme`에 정의되어 있어야 빌드/렌더가 된다.
- 부모 컨테이너는 단순 `flex flex-col items-center gap-5 py-2`이므로, 떠 있는 위치(고정/우측 정렬)는 [`App`](./app-shell.md) 셸 레이아웃에서 책임진다. 자체적으로 `fixed`/`absolute`를 쓰지 않는다.
