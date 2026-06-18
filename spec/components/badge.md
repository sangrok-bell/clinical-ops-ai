# Badge — `CountPill` & `Dot`

## 1. Purpose
읽지 않은 개수를 표시하는 작은 알약형 카운트 배지(`CountPill`)와, 개수 없이 "새 항목 있음"만 알리는 점 인디케이터(`Dot`)를 제공한다. 색은 상태(status)만 전달하며, 항상 비색상 보조 신호(텍스트 숫자 또는 ring)와 함께 쓴다.

## 2. File path + exports
- File: `aurora-ui/src/components/badge.tsx` (생성 타깃: `src/components/ui/badge.tsx`)
- Exports:
  - `export function CountPill(...)`
  - `export function Dot(...)`

## 3. Props

### `CountPill`
| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| `tone` | `PillTone` (`"positive" \| "magenta" \| "danger"`) | `"positive"` | no | 채움 색상(상태)을 결정. `02-data-contracts.md`의 `PillTone` 사용 — 아래 [Composition](#6-composition) 참조 |
| `urgent` | `boolean` | `false` | no | `true`이면 `ring-2 ring-white/30` 비색상 강조 링을 추가(grayscale에서도 의미 유지, WCAG 1.4.1) |
| `className` | `string` | `undefined` | no | `cn()`으로 병합되는 추가 클래스 |
| `children` | `React.ReactNode` | — | yes | 표시할 카운트(숫자/짧은 텍스트) |

### `Dot`
| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| `className` | `string` | `undefined` | no | `cn()`으로 병합되는 추가 클래스 |

> 참고: `Dot`은 `children`을 받지 않는다(자기-닫힘 `<span>`).

## 4. Variants & states
`CountPill`/`Dot`은 비대화형(non-interactive) `<span>`이므로 hover/active/focus-visible/disabled 상태가 없다. 색상은 `tone`으로, 강조는 `urgent`로만 분기한다.

### `CountPill` — tone (배경)
| tone | 적용 클래스 | 의미 |
| --- | --- | --- |
| `positive` (default) | `bg-positive` | 일반/긍정 카운트 |
| `magenta` | `bg-magenta` | 강조/멘션류 카운트 |
| `danger` | `bg-danger` | 위험/에러 카운트 |

내부 `toneBg` 매핑(소스 그대로):
```ts
const toneBg: Record<PillTone, string> = {
  positive: "bg-positive",
  magenta: "bg-magenta",
  danger: "bg-danger",
};
```

### `CountPill` — urgent
| state | 추가 클래스 |
| --- | --- |
| `urgent={false}` (default) | (없음) |
| `urgent={true}` | `ring-2 ring-white/30` |

### `Dot`
- 단일 형태. 색상은 항상 `bg-magenta` 고정, `size-2`, `rounded-full`.

## 5. Design tokens used
모든 토큰 유틸리티는 `../01-tokens.md`의 정의를 따른다.

| 토큰 | 위치 | 적용 대상 |
| --- | --- | --- |
| `text-onaccent` | `CountPill` 베이스 | 채움 위 어두운 텍스트(흰색 금지, AA 확보) — 자세한 내용 `../01-tokens.md` |
| `rounded-pill` | `CountPill` 베이스 | 알약형(full) 모서리 — `../01-tokens.md` |
| `bg-positive` | `CountPill` (tone) | positive 채움 — `../01-tokens.md` |
| `bg-magenta` | `CountPill` (tone) + `Dot` | magenta 채움 / Dot 색 — `../01-tokens.md` |
| `bg-danger` | `CountPill` (tone) | danger 채움 — `../01-tokens.md` |

> 비토큰 레이아웃 유틸리티(`inline-flex h-5 min-w-5 items-center justify-center px-1.5 text-xs font-semibold`, `ring-2 ring-white/30`, `inline-block size-2 rounded-full`)는 디자인 토큰이 아니지만 검증된 소스 클래스이므로 그대로 유지한다.

## 6. Composition
- 다른 컴포넌트를 렌더링하지 않는다(leaf primitive). `cn()`(`src/lib/utils.ts`)만 사용.
- 소비하는 데이터 타입: `PillTone` — [02-data-contracts.md](../02-data-contracts.md) 참조.
- 이 배지를 합성/소비하는 sibling 스펙:
  - [Sidebar](./sidebar.md) — `NavEntry.count`/`tone`을 `CountPill`로 렌더.
  - [nav (NavItem)](./nav.md) — 내비 항목 우측 카운트로 사용.
  - [FloatingToolbar](./floating-toolbar.md) — IconButton 위 카운트/Dot 오버레이.
  - [NotificationPanel](./notification-panel.md) — 탭/행의 unread 표시에 `Dot` 사용.

## 7. Accessibility
- **Color-is-not-the-only-signal:** `CountPill`은 색 외에 실제 숫자 텍스트를 항상 표시한다. `urgent`는 색 대신 `ring-2 ring-white/30` 링으로 긴급함을 전달하므로 grayscale에서도 구분된다(WCAG 1.4.1).
- **Contrast:** 채움 위 텍스트는 `text-onaccent`(어두운 톤)로 흰색 텍스트를 쓰지 않아 AA 마진을 확보한다.
- **Dot a11y:** `Dot`은 시각적 점만 제공하므로 의미가 없는 장식 요소다. 부모 인터랙티브 요소에 `aria-label`(예: `aria-label="새 알림 있음"`)을 붙여 스크린리더가 의미를 읽도록 한다.
- **Focus ring:** 두 컴포넌트 모두 비대화형이라 자체 포커스 링이 없다. 클릭 가능한 컨테이너(예: [Button](./button.md), [nav (IconButton)](./nav.md))로 감쌀 때 그 컨테이너가 `focus-visible:ring-2 focus-visible:ring-brand`를 책임진다.
- **Hit area:** 배지 자체는 타깃이 아니다. 인터랙션이 필요하면 충분한 히트 영역을 가진 부모 컨트롤에 배치한다.

## 8. Usage example
```tsx
import { CountPill, Dot } from "@/components/ui/badge";

export function BadgeExamples() {
  return (
    <div className="flex items-center gap-3">
      {/* default positive */}
      <CountPill>3</CountPill>

      {/* magenta tone */}
      <CountPill tone="magenta">12</CountPill>

      {/* danger + urgent ring */}
      <CountPill tone="danger" urgent>
        9+
      </CountPill>

      {/* unread dot, meaning via parent aria-label */}
      <button
        type="button"
        aria-label="새 알림 있음"
        className="relative inline-flex size-9 items-center justify-center rounded-btn focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Dot className="absolute right-1 top-1" />
      </button>
    </div>
  );
}
```

## 9. Generation notes
- `tone` 값은 반드시 `PillTone`("positive" | "magenta" | "danger")만 사용한다. `TagTone`/`ToastVariant`와 혼동 금지 — [02-data-contracts.md](../02-data-contracts.md) 참조.
- 텍스트 색은 `text-onaccent` 고정. 채움 위에 `text-white`를 쓰지 말 것(대비 회귀).
- `urgent` 링은 색이 아니라 `ring-white/30` 흰색 반투명 링이다(상태색이 아닌 비색상 신호이므로 의도된 것).
- `Dot`은 `children`을 받지 않는다. 카운트가 필요하면 `CountPill`을 쓴다.
- `min-w-5` + `h-5` + `rounded-pill` 조합으로 한 자리 숫자도 원형, 여러 자리는 알약형으로 늘어난다. 폭을 고정하지 말 것.
- 토큰 유틸리티(`bg-positive` 등)는 `index.css`의 `@theme`에 정의돼 있어야 컴파일된다 — `../01-tokens.md` 및 [00-architecture.md](../00-architecture.md) 참조.
- import 경로는 생성 앱에서 `@/components/ui/badge`(별칭 `@/` -> `src/`), `@/lib/utils`의 `cn()`을 사용한다.
