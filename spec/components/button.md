# Button

## 1. Purpose
앱 전역의 액션 트리거 프리미티브. `cva` 기반으로 4종 `variant`(brand/surface/ghost/outline)와 3종 `size`(md/sm/icon)를 조합해 CTA·보조 버튼·아이콘 버튼을 모두 커버한다.

## 2. File path + exports
- **File:** `src/components/ui/button.tsx`
- **Exports:**
  - `Button` — `React.forwardRef<HTMLButtonElement, ButtonProps>` 컴포넌트 (named export)
  - `ButtonProps` — props 인터페이스 (named export)
  - `buttonVariants` — `cva` 인스턴스 (named export, 다른 요소에 버튼 스타일을 입힐 때 재사용)

## 3. Props
`ButtonProps`는 `React.ButtonHTMLAttributes<HTMLButtonElement>`와 `VariantProps<typeof buttonVariants>`를 그대로 상속한다. 자체 선언 필드는 없고, `variant`/`size`가 `cva`에서 파생된다. 나머지(`onClick`, `disabled`, `type`, `children`, `aria-*` 등)는 네이티브 `<button>` 속성이다.

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `variant` | `"brand" \| "surface" \| "ghost" \| "outline"` | `"brand"` | No | 시각적 스타일. `defaultVariants`에서 `"brand"`로 지정됨. |
| `size` | `"md" \| "sm" \| "icon"` | `"md"` | No | 크기/형태. `icon`은 정사각 `size-10` + `rounded-pill`(원형). |
| `className` | `string` | `undefined` | No | 추가 클래스. `cn()`으로 variant 클래스 뒤에 머지되어 개별 오버라이드 가능. |
| `disabled` | `boolean` | `undefined` | No | 네이티브 속성. 활성 시 `pointer-events-none` + `opacity-40`. |
| `type` | `"button" \| "submit" \| "reset"` | (브라우저 기본 `"submit"`) | No | 네이티브 속성. 폼 밖에서는 `"button"` 명시 권장(8번 참고). |
| `children` | `React.ReactNode` | `undefined` | No | 라벨/아이콘. `[&_svg]:shrink-0`로 아이콘이 찌그러지지 않음. |
| `ref` | `Ref<HTMLButtonElement>` | `undefined` | No | `forwardRef`로 `<button>`에 전달됨. |
| `...props` | `ButtonHTMLAttributes` | — | No | 나머지 모든 네이티브 button 속성(`onClick`, `aria-label` 등). |

## 4. Variants & states

### variant
| variant | 기본 클래스 | hover | active |
| --- | --- | --- | --- |
| `brand` | `bg-brand-gradient text-white shadow-soft` | `hover:brightness-110` | `active:scale-[0.98]` |
| `surface` | `bg-elevated text-ink` | `hover:brightness-125` | `active:scale-[0.98]` |
| `ghost` | `text-ink/90` (투명 배경) | `hover:bg-elevated` | `active:scale-[0.98]` |
| `outline` | `border border-white/10 text-ink` | `hover:bg-elevated` | (active scale 없음) |

### size
| size | 클래스 |
| --- | --- |
| `md` | `h-11 rounded-btn px-4 text-sm` |
| `sm` | `h-9 rounded-btn px-3 text-sm` |
| `icon` | `size-10 rounded-full` (정사각 원형, 패딩 없음) |

### 공통(base) 상태
- **default:** `inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all outline-none`
- **focus-visible:** `focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas` — 키보드 포커스 시에만 brand 링, canvas 색 오프셋으로 분리.
- **disabled:** `disabled:pointer-events-none disabled:opacity-40`
- **icon slot:** `[&_svg]:shrink-0`

## 5. Design tokens used
모든 토큰의 값/정의는 [../01-tokens.md](../01-tokens.md) 참조. 아래는 Aurora 캐노니컬 토큰만 나열(`flex`/`gap-2`/`h-11`/`px-4`/`size-10` 등 일반 레이아웃 유틸은 토큰이 아님).

| Token | 적용 위치 |
| --- | --- |
| `bg-brand-gradient` | `variant="brand"` fill. 이 fill 위에서만 `text-white` 허용(stop이 어둡게 보정되어 AA 통과, see [../01-tokens.md](../01-tokens.md)). |
| `bg-elevated` | `variant="surface"` 배경, `ghost`/`outline`의 hover 배경. |
| `text-ink` | `surface`/`outline` 라벨, `ghost`는 `text-ink/90`. |
| `shadow-soft` | `variant="brand"`의 약한 부양 그림자. |
| `rounded-btn` | `size="md"`/`size="sm"` 모서리(14px). |
| `rounded-full`(= `rounded-pill`) | `size="icon"` 원형. |
| `ring-brand` | `focus-visible:ring-brand` 포커스 링(브랜드 teal, 전역 focus 기본값). |
| `ring-offset-canvas` | 포커스 링 오프셋을 캔버스 배경색에 맞춤. |

## 6. Composition
- **렌더하는 컴포넌트:** 없음. `Button`은 순수 프리미티브로 단일 `<button>`만 렌더한다. 아이콘은 `children`으로 외부에서 주입(예: `lucide-react`).
- **이 컴포넌트를 합성하는 상위 컴포넌트:** [Sidebar](./sidebar.md)가 상단 CTA로 사용. 아이콘 전용 버튼 변형은 [nav.md](./nav.md)의 `IconButton`(별도 컴포넌트)과 [floating-toolbar.md](./floating-toolbar.md)에서 다룬다.
- **소비하는 데이터 타입:** 없음. `data.ts`의 타입을 직접 사용하지 않는다(see [../02-data-contracts.md](../02-data-contracts.md)).
- **유틸:** `cn()` (`src/lib/utils.ts`), `cva`/`VariantProps` (`class-variance-authority`).

## 7. Accessibility
- **Focus ring:** `focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas` — 마우스 클릭이 아닌 키보드 포커스에서만 표시. `outline-none`은 기본 아웃라인 제거용이며 링이 대체한다.
- **Color-is-not-the-only-signal:** variant 구분은 색 외에도 형태(테두리/배경/그림자)와 크기로 백업된다. 상태 의미(success/danger)는 Button 자체가 표현하지 않으므로 색 단독 의존 위험이 없다.
- **Hit area:** `md`=44px(`h-11`), `icon`=40px(`size-10`). 터치 타깃은 44px 권장이므로 `sm`(36px)/`icon`(40px)은 조밀 영역에서만 사용.
- **aria:** `variant="icon"`처럼 텍스트 라벨이 없는 버튼은 반드시 `aria-label`을 넘긴다(네이티브 속성으로 그대로 전달됨).
- **disabled:** `disabled` 시 `pointer-events-none`로 클릭 차단 + `opacity-40`로 시각 신호. 스크린리더용 비활성은 네이티브 `disabled` 속성이 처리.

## 8. Usage example
```tsx
import { Plus, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ButtonDemo() {
  return (
    <div className="flex items-center gap-3">
      {/* 기본값 = brand / md, 폼 밖이므로 type="button" 명시 */}
      <Button type="button" onClick={() => console.log("new")}>
        <Plus className="size-4" />
        New
      </Button>

      <Button type="button" variant="surface" size="sm">
        Filter
      </Button>

      <Button type="button" variant="ghost">
        Cancel
      </Button>

      <Button type="button" variant="outline">
        Export
      </Button>

      {/* 아이콘 전용: 반드시 aria-label */}
      <Button type="button" variant="surface" size="icon" aria-label="Notifications">
        <Bell className="size-5" />
      </Button>

      <Button type="button" disabled>
        Saving…
      </Button>
    </div>
  );
}
```

## 9. Generation notes
- **Named export only.** `export const Button = React.forwardRef(...)` 형태이며 `export default`가 없다. import는 `import { Button } from "@/components/ui/button"`.
- **`displayName` 설정 필수:** `Button.displayName = "Button"` — `forwardRef`라 생략 시 devtools/일부 린트에서 경고.
- **`buttonVariants`도 export:** 링크/`<a>` 등 비-button 요소에 버튼 룩을 입힐 때 `className={buttonVariants({ variant, size })}`로 재사용. 컴포넌트 자체는 `<button>`만 렌더하므로 `asChild` 패턴은 없음.
- **`text-white` on brand만 허용:** `variant="brand"`는 `text-white`를 base에 내장한다. 다른 saturated fill 위에 흰 텍스트를 임의로 넣지 말 것(see [../01-tokens.md](../01-tokens.md)). surface/ghost/outline은 `text-ink` 계열을 쓴다.
- **`icon` size는 `rounded-full`(원형) + 패딩 없음:** `px-*`가 없으므로 내부 아이콘은 `size-4`/`size-5`로 직접 크기 지정. `md`/`sm`만 `rounded-btn`을 쓴다(혼동 주의).
- **`type` 기본값 함정:** 네이티브 `<button>`은 폼 안에서 기본 `type="submit"`. 폼 컨텍스트에서 단순 액션 버튼은 반드시 `type="button"` 명시(예제처럼).
- **`className`은 항상 마지막에 머지:** `cn(buttonVariants({ variant, size }), className)` 순서라 `tailwind-merge`가 충돌 시 호출자 `className`을 이기게 한다 — 오버라이드가 의도대로 동작.
- **base의 `outline-none`은 의도된 것:** 포커스 가시성은 `focus-visible:ring-*`가 담당하므로 `outline-none`을 제거하지 말 것.
