# ToastStack

## 1. Purpose
세 가지 레퍼런스 [Toast](./toast.md) 상태(success / info / ghost)를 한 컬럼에 쌓아 보여주는 데모 컴포지트. 알림 변형의 시각 톤을 한눈에 비교/검수하기 위한 정적 쇼케이스이며, 실제 이벤트 배선은 day-of에 추가한다.

## 2. File path + exports
- File: `components/ui/../components/ToastStack.tsx` → 정확히는 `components/ToastStack.tsx`
- Exports: `ToastStack` (named export, function component, props 없음)
- 별도 타입/상수 export 없음. 자식 변형 타입은 [Toast](./toast.md)가 소유한다.

## 3. Props
`ToastStack`은 **props를 받지 않는다** (인자 없는 함수 컴포넌트). 별도 `interface` 선언이 없다.

| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| — | — | — | — | props 없음. 세 개의 [Toast](./toast.md)를 고정 콘텐츠로 렌더하는 정적 컴포지트 |

> 내용을 동적으로 바꾸거나 닫기 동작을 배선하려면 이 컴포넌트를 직접 수정하거나, 데이터 배열을 받는 변형으로 확장한다 (Generation notes 참고).

## 4. Variants & states
- `ToastStack` 자체는 변형/상호작용 상태가 없다. 단일 정적 레이아웃이다.
- 내부에 렌더되는 세 [Toast](./toast.md)가 각자의 변형 톤을 가진다.

| 순서 | variant | title | message |
| --- | --- | --- | --- |
| 1 | `success` | `Successful toast` | `It's a green notification state` |
| 2 | `info` | `Neutral blue toast` | `It's a secondary notification state` |
| 3 | `ghost` | `App Notifications UI` | `Design tutorial for smart designers` |

- **default**: 각 [Toast](./toast.md)는 마운트 시 `animate-toast-in` 진입 애니메이션을 재생.
- **hover / active / focus-visible / disabled**: 컨테이너 레벨에는 없음. 각 [Toast](./toast.md)의 닫기 버튼 hover 동작만 존재하며, 여기서는 `onClose`를 넘기지 않아 클릭은 no-op.

## 5. Design tokens used
`ToastStack`의 래퍼 `div`는 **Aurora 디자인 토큰을 직접 사용하지 않는다** — 순수 레이아웃 유틸리티(`flex w-full max-w-[460px] flex-col gap-4`)만 쓴다. 모든 디자인 토큰은 자식 [Toast](./toast.md)에서 적용된다. 토큰 정의는 [../01-tokens.md](../01-tokens.md) 참고.

| token | 적용 위치 (자식 [Toast](./toast.md) 경유) |
| --- | --- |
| `bg-success-gradient` | success 토스트 wrap 배경 |
| `bg-info-gradient` | info 토스트 wrap 배경 |
| `glass` | ghost 토스트 wrap 표면 |
| `shadow-glow-green` | success 토스트 글로우 |
| `shadow-glow-blue` | info 토스트 글로우 |
| `shadow-glow-teal` | ghost 토스트 글로우 |
| `text-positive` | ghost 토스트 iconBox 아이콘 색 |
| `text-ink` | ghost 토스트 title 및 close 색 |
| `rounded-toast` | 각 토스트 루트 반경 (16) |
| `animate-toast-in` | 각 토스트 진입 애니메이션 |

> 래퍼의 `w-full max-w-[460px]`는 디자인 토큰이 아니라 일반 레이아웃 유틸리티다. 이 폭 제한이 자식 [Toast](./toast.md)의 `message` `truncate` 동작을 가능하게 한다.

## 6. Composition
- 렌더하는 컴포넌트: [Toast](./toast.md) × 3 (`variant`만 다르게).
- 소비 데이터 타입: 없음. mock 콘텐츠를 인라인 리터럴로 직접 주입하므로 [../02-data-contracts.md](../02-data-contracts.md)의 `history`/`HistoryItem` 등 배열을 사용하지 않는다. (이벤트 기반으로 확장할 때 데이터 계약을 도입한다 — [../02-data-contracts.md](../02-data-contracts.md) 참고.)
- 아키텍처 위치: [../00-architecture.md](../00-architecture.md)의 알림 UI 흐름에서 [NotificationPanel](./notification-panel.md)과 함께 토스트 상태 쇼케이스를 담당한다.

## 7. Accessibility
- `ToastStack` 래퍼는 단순 `div`로 추가 ARIA 속성이 없다. 접근성 의미는 각 자식 [Toast](./toast.md)가 담당한다:
  - 각 토스트 루트는 `role="status"` 라이브 영역.
  - 각 토스트 닫기 버튼은 `aria-label="Dismiss notification"` + `type="button"`.
  - 색이 유일한 신호가 아님: 각 변형이 의미 아이콘(`CheckCheck` / `BellOff`)과 텍스트를 동반.
- 동일한 `aria-label`("Dismiss notification")이 3회 반복되므로, 실제 알림으로 배선할 때는 토스트별 고유 식별 텍스트를 라벨에 포함하는 것을 권장.
- focus ring: 자식 [Toast](./toast.md) 닫기 버튼에 focus-visible ring이 소스에 없다. CONTRACT의 `focus-visible:ring-2 focus-visible:ring-brand` 규칙은 [Toast](./toast.md) 레벨에서 추가한다.
- Hit area: 래퍼는 추가 hit area를 제공하지 않음. 각 토스트의 닫기 버튼 `p-1` 패딩에 의존.

## 8. Usage example
```tsx
import { ToastStack } from "@/components/ToastStack";

export function Example() {
  return (
    <div className="min-h-screen bg-canvas p-8">
      <ToastStack />
    </div>
  );
}
```

## 9. Generation notes
- `ToastStack`은 **props가 없는** 정적 컴포지트다. 시그니처는 `export function ToastStack()` 그대로 유지한다.
- import 경로 주의: 자식은 `@/components/ui/toast`의 [Toast](./toast.md)에서 가져오고, 본인은 `components/ToastStack.tsx`에 위치한다 (`ui/` 하위가 아님).
- 래퍼 클래스는 정확히 `flex w-full max-w-[460px] flex-col gap-4`. `max-w-[460px]`가 자식 토스트 `message`의 `truncate`를 작동시키므로 폭 제한을 제거하지 말 것.
- 세 토스트의 순서/콘텐츠는 레퍼런스 상태를 보여주기 위한 고정값이다. success → info → ghost 순서를 유지한다.
- ghost 변형은 `glass` 표면을 쓰므로 **어두운 배경**(`bg-canvas` 등) 위에 올려야 의도대로 보인다 — [../01-tokens.md](../01-tokens.md)의 `bg-canvas` 참고.
- `onClose`를 넘기지 않으므로 닫기 버튼은 렌더되되 no-op이다. 실제 dismiss 로직(상태 제거)은 이 컴포넌트를 상태 보유형으로 확장하면서 각 [Toast](./toast.md)에 `onClose`를 배선해야 한다.
