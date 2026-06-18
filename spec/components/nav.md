# nav

## 1. Purpose
사이드바와 탭 UI를 구성하는 저수준 빌딩 블록 모음입니다. `NavItem`(아이콘+라벨+카운트 행), `SectionLabel`(그룹 제목), `Tab`(밑줄 탭), `IconButton`(원형 아이콘 버튼)을 제공합니다.

## 2. File path + exports
- File: `components/ui/nav.tsx`
- Exports: `NavItem`, `SectionLabel`, `Tab`, `IconButton`

## 3. Props

### `NavItem`
`React.ButtonHTMLAttributes<HTMLButtonElement>`를 확장합니다 (`onClick`, `disabled`, `aria-*` 등 모두 전달 가능, `{...props}`로 spread).

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `icon` | `LucideIcon` | — | yes | 좌측에 렌더되는 lucide 아이콘. 내부에서 `Icon`으로 alias 되어 `size-5`로 렌더됩니다. |
| `label` | `string` | — | yes | 행 라벨 텍스트. `flex-1 font-medium`로 채워집니다. |
| `count` | `number` | `undefined` | no | 정의되면 우측에 [CountPill](./badge.md)을 렌더합니다. `0`도 표시됩니다 (`!== undefined` 체크). |
| `tone` | `PillTone` | `"positive"` | no | CountPill의 톤. `"danger"`이면 CountPill에 `urgent` ring이 자동 적용됩니다. 데이터 타입은 [02-data-contracts.md](../02-data-contracts.md) 참조. |
| `active` | `boolean` | `undefined` | no | 활성(현재 페이지) 상태. `aria-current="page"`와 elevated 배경을 적용합니다. |
| `className` | `string` | `undefined` | no | `cn()`으로 병합되는 추가 클래스. |

### `SectionLabel`
| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `children` | `React.ReactNode` | — | yes | 그룹 제목 텍스트 (예: `"Pages"`, `"Tags"`). 대문자/letter-spacing은 클래스로 처리되므로 원문 그대로 전달합니다. |

### `Tab`
`React.ButtonHTMLAttributes<HTMLButtonElement>`를 확장합니다.

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `active` | `boolean` | `undefined` | no | 활성 탭. `text-positive`와 하단 밑줄 인디케이터를 렌더합니다. |
| `dot` | `boolean` | `undefined` | no | `true`면 우상단에 [Dot](./badge.md)("new" 표시)를 렌더합니다. |
| `children` | `React.ReactNode` | — | yes | 탭 라벨. |
| `className` | `string` | `undefined` | no | `cn()`으로 병합되는 추가 클래스. |

### `IconButton`
`React.ButtonHTMLAttributes<HTMLButtonElement>`를 확장합니다.

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `icon` | `LucideIcon` | — | yes | 렌더되는 lucide 아이콘. 내부에서 `Icon`으로 alias 되어 `size-5`로 렌더됩니다. |
| `glassy` | `boolean` | `undefined` | no | `true`면 `glass size-12 shadow-soft`(blur surface, 더 큰 히트영역), `false/미지정`이면 `size-10`. |
| `className` | `string` | `undefined` | no | `cn()`으로 병합되는 추가 클래스. 배지를 절대 위치로 얹을 때 사용합니다. |

## 4. Variants & states

### `NavItem`
- **default**: `text-ink/85`, 투명 배경. 아이콘은 `text-icon`.
- **hover**: `hover:bg-elevated/60`.
- **active**: `bg-elevated text-ink shadow-[0_0_0_1px_rgba(255,255,255,0.06)]`, 아이콘은 `text-ink`, `aria-current="page"`.
- **focus-visible**: `outline-none focus-visible:ring-2 focus-visible:ring-brand`.
- **disabled**: `disabled` 속성 전달 시 네이티브 비활성화 (전용 스타일 클래스는 없음).

### `Tab`
- **default**: `text-ink/70`.
- **hover**: `hover:text-ink`.
- **active**: `text-positive` + 하단 `bg-positive` 밑줄 인디케이터(`h-0.5 rounded-full`, `-bottom-px`).
- **focus-visible**: `outline-none focus-visible:text-ink` (ring이 아닌 텍스트 색으로 포커스를 표시).
- **dot**: `dot` prop이 true일 때만 우상단 Dot 표시.

### `IconButton`
- **default**: `text-icon`, 원형(`rounded-full`).
- **hover**: `hover:text-ink`.
- **focus-visible**: `outline-none focus-visible:ring-2 focus-visible:ring-brand`.
- **glassy**: `glass size-12 shadow-soft` (blur 표면). 비활성 시 `size-10`.

### `SectionLabel`
- 상태 없음 (정적 라벨, 비대화형 `<p>`).

## 5. Design tokens used
모든 토큰 정의는 [01-tokens.md](../01-tokens.md) 참조.

| Token | 적용 위치 |
| --- | --- |
| `bg-elevated` | `NavItem` active 배경 및 hover(`hover:bg-elevated/60`). |
| `text-ink` | `NavItem` active 텍스트/아이콘, `Tab` hover/focus 텍스트. (`text-ink/85`, `text-ink/70` 등 opacity 변형 포함) |
| `text-icon` | `NavItem` 비활성 아이콘, `IconButton` 기본 아이콘 색. |
| `text-dim` | `SectionLabel` 텍스트(`text-dim/80`). |
| `text-positive` | `Tab` active 텍스트. |
| `bg-positive` | `Tab` active 밑줄 인디케이터. |
| `ring-brand` | `NavItem`/`IconButton` `focus-visible:ring-brand`. |
| `rounded-pill` | (`CountPill` 내부) — `NavItem`이 합성하는 카운트 배지. |
| `shadow-soft` | `IconButton` glassy 변형. |
| `glass` | `IconButton` glassy 변형의 blur 표면. |
| `rounded-2xl` | `NavItem` 코너 (generic Tailwind radius; `rounded-card`가 아닌 native 값 사용). |
| `bg-magenta` | (`Dot` 내부) — `Tab`이 합성하는 "new" 인디케이터. |

> 참고: `NavItem`은 `rounded-2xl`(1rem / 16px — generic Tailwind radius이며 `rounded-card`의 20px이 아님)를 직접 사용하며 `rounded-card` alias를 쓰지 않습니다. 소스 그대로 유지하세요.

## 6. Composition
- `NavItem` → [CountPill](./badge.md) 렌더 (`count`가 정의된 경우, `tone`과 `urgent={tone === "danger"}` 전달).
- `Tab` → [Dot](./badge.md) 렌더 (`dot`이 true인 경우, 절대 위치).
- 소비하는 데이터 타입: `PillTone` (`NavItem.tone`) — [02-data-contracts.md](../02-data-contracts.md) 참조.
- 상위 합성: 이 빌딩 블록들은 [Sidebar](./sidebar.md)(`NavItem`, `SectionLabel`), [NotificationPanel](./notification-panel.md)(`Tab`), [FloatingToolbar](./floating-toolbar.md)(`IconButton`)에서 사용됩니다.
- `NavEntry` 데이터(`{ icon, label, count?, tone?, active? }`)는 `NavItem` props와 1:1로 매핑됩니다 — [02-data-contracts.md](../02-data-contracts.md) 참조.

## 7. Accessibility
- **focus ring**: `NavItem`, `IconButton`은 `focus-visible:ring-2 focus-visible:ring-brand`. `Tab`은 ring 대신 `focus-visible:text-ink`로 포커스를 시각화합니다 (밑줄 탭 특성상 ring이 잘리는 것을 회피).
- **aria**: `NavItem`은 active일 때 `aria-current="page"`를 설정합니다. `IconButton`은 라벨 텍스트가 없으므로 호출부에서 `aria-label`을 반드시 전달해야 합니다(spread로 가능). `Tab`도 children이 아이콘만일 경우 `aria-label` 권장.
- **color-is-not-the-only-signal**: `Tab` active는 색(`text-positive`)뿐 아니라 밑줄 인디케이터로도 표시됩니다. `NavItem`의 danger 카운트는 CountPill의 `urgent` ring(비색상 단서)으로 보강됩니다. `Dot`은 위치 기반 단서이므로 부모에 `aria-label`을 붙이세요.
- **hit area**: `NavItem`은 `w-full px-3 py-2.5`로 전폭 타깃. `IconButton`은 `size-10`(기본) 또는 `size-12`(glassy)로 충분한 터치 영역.
- 모든 대화형 요소는 `type="button"`으로 폼 submit을 방지합니다.

## 8. Usage example
```tsx
import { Home, Bell, Settings } from "lucide-react";
import { NavItem, SectionLabel, Tab, IconButton } from "@/components/ui/nav";

export function NavDemo() {
  return (
    <div className="flex flex-col gap-2 bg-sidebar p-3">
      <SectionLabel>Pages</SectionLabel>
      <NavItem icon={Home} label="Home" active />
      <NavItem icon={Bell} label="Alerts" count={3} tone="danger" />

      <div className="mt-4 flex gap-6 border-b border-white/10">
        <Tab active>Activity</Tab>
        <Tab dot>Mentions</Tab>
      </div>

      <div className="mt-4 flex gap-2">
        <IconButton icon={Settings} aria-label="Settings" />
        <IconButton icon={Bell} aria-label="Notifications" glassy />
      </div>
    </div>
  );
}
```

## 9. Generation notes
- `count`는 `count !== undefined`로 검사하므로 `count={0}`도 CountPill을 렌더합니다. 배지를 숨기려면 prop을 아예 전달하지 마세요.
- `tone="danger"`이면 CountPill의 `urgent` ring이 **자동** 적용됩니다 — 별도 prop 불필요(`urgent={tone === "danger"}`).
- `icon`은 컴포넌트 참조(`Home`)를 넘기며 JSX(`<Home />`)가 아닙니다. 내부에서 `icon: Icon`으로 rename 후 렌더합니다.
- `IconButton`은 시각 라벨이 없으므로 호출부에서 `aria-label`을 spread로 반드시 넘겨야 합니다.
- `NavItem`은 `rounded-2xl`, active는 inline `shadow-[0_0_0_1px_rgba(255,255,255,0.06)]` arbitrary 값을 그대로 사용합니다 — 토큰으로 치환하지 마세요.
- `Tab` active 밑줄(`-bottom-px`)과 `-mb-px`는 부모 컨테이너의 `border-b`와 겹쳐 1px 라인을 덮도록 설계되었습니다. 부모에 하단 보더가 있어야 의도대로 보입니다.
- `CountPill`/`Dot`은 [badge.tsx](./badge.md)에서 import 됩니다. 동일 파일에 정의되어 있다고 가정하지 마세요.
- 네 컴포넌트 모두 named export입니다. default export 없음.
