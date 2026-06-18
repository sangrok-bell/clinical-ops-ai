# Card

## 1. Purpose

Aurora 디자인 시스템의 가장 기본이 되는 컨테이너 프리미티브. 어두운 배경 위에 살짝 떠 있는(elevated) 패널 표면을 만들어, 모든 패널형 UI(예: [NotificationPanel](./notification-panel.md))의 base 컨테이너로 사용된다.

## 2. File path + exports

- File: `src/components/ui/card.tsx` (아키텍처상 PRIMITIVES 위치, 검증된 source는 `aurora-ui/src/components/card.tsx`)
- Exports:
  - `Card` — named export. function component.

```ts
export function Card(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element
```

## 3. Props — full TypeScript interface table

`Card`는 별도의 props 인터페이스를 선언하지 않고 `React.HTMLAttributes<HTMLDivElement>`를 그대로 받는다. 즉, 표준 `<div>`의 모든 속성을 지원한다.

| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| `className` | `string` | `undefined` | No | 추가 유틸리티 클래스. `cn()`을 통해 base 클래스 뒤에 병합되어 충돌 시 호출자 클래스가 우선한다. |
| `children` | `React.ReactNode` | `undefined` | No | 카드 내부에 렌더링할 컨텐츠. (`HTMLAttributes`에 포함) |
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | — | No | `onClick`, `id`, `role`, `style`, `data-*`, `aria-*` 등 모든 표준 `<div>` 속성을 그대로 전달(spread)한다. |

> 참고: `Card`는 `forwardRef`를 사용하지 않으므로 `ref` prop은 전달되지 않는다.

## 4. Variants & states

`Card`는 cva 기반 variant를 갖지 않는 단일 표면 프리미티브이다. 상태별 시각 변화는 컴포넌트 자체에 내장되어 있지 않으며, 필요 시 호출자가 `className`으로 추가한다.

| 상태 | 동작 |
| --- | --- |
| default | `rounded-card` + `border border-white/5` + `bg-surface` + `shadow-card`의 고정된 떠 있는 패널 표면. |
| hover | 내장 없음. interactive 카드가 필요하면 호출자가 `className`에 hover 효과를 추가한다. |
| active | 내장 없음. |
| focus-visible | 내장 없음. `Card`는 기본적으로 비-interactive 컨테이너이다. 클릭 가능한 카드로 만들 경우 호출자가 `tabIndex`/`role`과 함께 `focus-visible:ring-2 focus-visible:ring-brand`(see ../01-tokens.md)를 직접 부여해야 한다. |
| disabled | 해당 없음(`<div>`는 disabled 개념이 없음). |

## 5. Design tokens used

`Card`가 base 클래스에서 사용하는 Aurora 토큰 유틸리티(각 정의는 ../01-tokens.md 참고):

| 토큰 | 적용 위치 |
| --- | --- |
| `rounded-card` | 카드 모서리 반경(20). 패널의 기본 라운딩. |
| `bg-surface` | 패널 표면 색상. canvas(`bg-canvas`) 위에서 한 단계 떠 있는 어두운 표면. |
| `shadow-card` | 카드 elevation 그림자. 표면이 캔버스에서 분리되어 보이게 한다. |

> 비-토큰 클래스: `border` + `border-white/5`. 이는 디자인 토큰 유틸리티가 아닌 일반 Tailwind 클래스로, 표면 가장자리에 미세한 하이라이트 테두리를 그린다. (CONTRACT의 closed token set에 속하지 않으므로 토큰으로 분류하지 않음)

## 6. Composition

- 렌더링하는 하위 컴포넌트: 없음. `Card`는 leaf-level 프리미티브이며 내부에 다른 Aurora 컴포넌트를 직접 렌더링하지 않는다.
- 소비하는 데이터 타입: 없음. `Card`는 ../02-data-contracts.md의 어떤 타입도 직접 소비하지 않는다.
- 이 컴포넌트를 composition하는 상위 컴포넌트:
  - [NotificationPanel](./notification-panel.md) — `Card`를 root 컨테이너로 사용하고 그 안에 [Tab](./nav.md), history row([Avatar](./media.md)/[Thumbnail](./media.md))을 배치한다.

## 7. Accessibility

- focus ring: `Card`는 기본 비-interactive 컨테이너라 자체 focus ring이 없다. 클릭 가능한 카드로 쓸 경우 호출자가 `role="button"`(또는 적절한 role), `tabIndex={0}`, 그리고 `focus-visible:ring-2 focus-visible:ring-brand`(see ../01-tokens.md)를 명시적으로 부여해야 한다.
- aria: 추가 aria 속성을 내장하지 않는다. landmark/region 의미가 필요하면 호출자가 `role`/`aria-label`을 spread props로 전달한다.
- color-is-not-the-only-signal: 카드는 색이 아니라 `shadow-card` elevation과 `border-white/5` 테두리로 캔버스와 분리되므로, 색 인지에 의존하지 않고 경계가 드러난다.
- hit area: `Card`는 자체 패딩을 두지 않는다. 내부 컨텐츠의 hit area/여백은 자식 요소나 호출자의 `className`(예: `p-*`)에서 책임진다.

## 8. Usage example

```tsx
import { Card } from "@/components/ui/card";

export function PanelExample() {
  return (
    <Card className="w-80 p-5">
      <h2 className="text-ink text-sm font-semibold">Notifications</h2>
      <p className="text-dim mt-1 text-xs">You have 3 unread updates.</p>
    </Card>
  );
}
```

클릭 가능한 카드로 확장하는 경우:

```tsx
<Card
  role="button"
  tabIndex={0}
  className="cursor-pointer p-5 transition focus-visible:ring-2 focus-visible:ring-brand"
  onClick={handleOpen}
>
  {/* ... */}
</Card>
```

## 9. Generation notes

- import 경로 주의: source는 `import { cn } from "../lib/utils"`를 사용한다. 타깃 구조(`src/components/ui/card.tsx`)에서는 `@/` alias를 쓰는 것이 컨벤션이므로 `import { cn } from "@/lib/utils"`로 생성한다. cn()은 clsx + tailwind-merge 래퍼여야 한다(../00-architecture.md).
- base 클래스 순서를 정확히 유지: `"rounded-card border border-white/5 bg-surface shadow-card"`. `border` 유틸리티(테두리 두께)와 `border-white/5`(테두리 색)는 둘 다 필요하다 — `border` 없이 `border-white/5`만 쓰면 테두리가 렌더되지 않는다.
- `cn(base, className)` 순서를 지킬 것. tailwind-merge가 호출자 `className`을 뒤에 두어 충돌 시(예: 다른 `rounded-*`나 `bg-*`) 호출자 값이 이기도록 한다.
- `forwardRef` 없음 — `ref`를 넘기려 하면 동작하지 않는다. ref가 필요한 사용처가 생기면 source 변경이 선행되어야 한다.
- variant/cva 도입 금지: 이 컴포넌트는 의도적으로 single-surface 프리미티브다. tone/elevation 변형은 호출자 `className`으로 처리한다.
- 자체 padding이 없으므로 텍스트가 모서리에 붙는다. 데모/패널에서는 호출자가 `p-*`를 반드시 추가한다.
