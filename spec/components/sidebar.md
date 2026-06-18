# Sidebar

## 1. Purpose
좌측 고정 내비게이션 레일. 로고 헤더, 기본 CTA([Button](./button.md)), 두 개의 nav 그룹(primary / pages)과 tag 그룹을 합성하며, 각 항목은 내부 `NavRow` / `SectionLabel` / `TagRow`로 렌더된다.

## 2. File path + exports
- File: `src/components/Sidebar.tsx`
- Exports: `Sidebar` (named export)
- Internal-only (not exported): `NavRow`, `SectionLabel`, `TagRow`, `tagDot`

## 3. Props
`Sidebar`는 props를 받지 않는다. 모든 콘텐츠는 [`../02-data-contracts.md`](../02-data-contracts.md)의 `primaryNav`, `pagesNav`, `tags`에서 가져온다.

### `Sidebar`
| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| — | — | — | — | props 없음. 데이터는 모듈 import로 주입됨 |

### 내부 `NavRow` (consumes [`NavEntry`](../02-data-contracts.md))
| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| `icon` | `LucideIcon` | — | yes | 좌측 아이콘 컴포넌트. 내부에서 `Icon`으로 alias 후 렌더 |
| `label` | `string` | — | yes | 행 텍스트 |
| `count` | `number` | `undefined` | no | 정의된 경우에만 [CountPill](./badge.md) 렌더 (`count !== undefined`) |
| `tone` | `PillTone` (`"positive" \| "magenta" \| "danger"`) | `undefined` | no | [CountPill](./badge.md)의 `tone`으로 전달 |
| `active` | `boolean` | `undefined` | no | active 스타일 + `aria-current="page"` |

### 내부 `SectionLabel`
| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| `children` | `string` | — | yes | 대문자 섹션 라벨 텍스트 |

### 내부 `TagRow`
| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| `label` | `string` | — | yes | 태그 텍스트 |
| `tone` | `TagTone` (`"danger" \| "warning" \| "caution" \| "positive"`) | — | yes | `tagDot[tone]`로 색 사각 dot 결정 |

## 4. Variants & states
`NavRow`와 `TagRow`는 네이티브 `<button type="button">`이며 상태별 클래스를 가진다.

| element | default | hover | active (selected) | focus-visible | disabled |
| --- | --- | --- | --- | --- | --- |
| `NavRow` | `text-ink/85`, 아이콘 `text-icon` | `hover:bg-elevated/60` | `bg-elevated text-ink shadow-[0_0_0_1px_rgba(255,255,255,0.06)]`, 아이콘 `text-ink`, `aria-current="page"` | `outline-none focus-visible:ring-2 focus-visible:ring-brand` | 미지원 (always enabled) |
| `TagRow` | `text-ink/85` | `hover:bg-elevated/60` | 없음 (selected 상태 없음) | `outline-none focus-visible:ring-2 focus-visible:ring-brand` | 미지원 |
| header CTA | [Button](./button.md) 기본 `variant="brand"`, `size="md"` | `hover:brightness-110` (Button 제공) | `active:scale-[0.98]` (Button 제공) | `focus-visible:ring-2 focus-visible:ring-brand` (Button 제공) | `disabled:opacity-40` (Button 제공) |

`active` 행은 `transition-colors`로 hover/active 간 색 전환을 부드럽게 한다. active일 때 hover 클래스는 적용되지 않는다(삼항 분기).

## 5. Design tokens used
모든 토큰은 [`../01-tokens.md`](../01-tokens.md) 참조. canonical 유틸리티만 사용.

| token | 적용 위치 |
| --- | --- |
| `bg-sidebar` | `<aside>` 루트 배경 |
| `bg-logo-sphere` | 헤더 로고 sphere (`size-11 rounded-full`) |
| `bg-elevated` | active `NavRow` 배경 |
| `bg-elevated/60` | `NavRow`/`TagRow` hover 배경 |
| `text-ink` | active 라벨/아이콘, 헤더 제목 |
| `text-ink/85` | 비활성 `NavRow`/`TagRow` 라벨 |
| `text-dim` | 헤더 서브타이틀 ("Design Tutorial") |
| `text-dim/80` | `SectionLabel` 텍스트 |
| `text-icon` | 비활성 nav 아이콘, 헤더 `ChevronsUpDown` |
| `ring-brand` | 모든 행의 `focus-visible:ring-2 focus-visible:ring-brand` |
| `bg-danger` | `tagDot.danger` (color dot) |
| `bg-warning` | `tagDot.warning` |
| `bg-caution` | `tagDot.caution` |
| `bg-positive` | `tagDot.positive` |

`rounded-2xl`(행), `border-white/5`(구분선), `ring-white/10`(로고 ring), `shadow-[0_0_0_1px_...]`(active inset)은 raw Tailwind/임의값으로, 디자인 토큰이 아니다. 색 dot의 `bg-danger`/`bg-warning`/`bg-caution`/`bg-positive`는 accent 토큰을 배경 표면에 직접 사용한 것.

## 6. Composition
렌더하는 컴포넌트:
- [Button](./button.md) — 헤더 "Read Guide" CTA. 기본 variant(`brand`)·size(`md`)로 사용, `className="w-full justify-center gap-2"` + 내부 `LayoutGrid` 아이콘.
- [CountPill](./badge.md) — `NavRow`에서 `count`가 있을 때. `tone={tone}`, `urgent={tone === "danger"}`로 전달.

소비하는 데이터 타입 ([`../02-data-contracts.md`](../02-data-contracts.md)):
- `NavEntry` — `primaryNav`, `pagesNav` 배열 항목, `NavRow`로 spread.
- `TagTone` — `tags` 항목의 `tone`, `tagDot` 매핑 키 및 `TagRow` prop.
- `PillTone` — `NavEntry.tone` 경유로 [CountPill](./badge.md)에 전달.
- import된 배열: `primaryNav`, `pagesNav`, `tags`.

아키텍처 전반은 [`../00-architecture.md`](../00-architecture.md) 참조.

## 7. Accessibility
- 모든 행은 `<button type="button">` (의미 있는 인터랙티브 요소, 기본 버튼 hit area 확보: `px-3 py-2.5`/`py-2`).
- focus ring: 모든 행과 CTA가 `focus-visible:ring-2 focus-visible:ring-brand`로 키보드 포커스를 표시.
- 현재 위치 표시: active 행은 `aria-current="page"`를 가져 스크린리더에도 전달됨(색에만 의존하지 않음).
- color-is-not-the-only-signal: active 행은 배경(`bg-elevated`) + inset ring shadow + 아이콘 색 강조 + `aria-current`로 다중 신호 제공. [CountPill](./badge.md)의 `urgent`(danger)는 `ring-2`라는 비색상 cue 추가. `TagRow`의 색 dot은 라벨 텍스트("High Priority" 등)가 항상 동반되어 색 단독 의존이 아니다.
- 헤더 `ChevronsUpDown`/로고 sphere는 장식 요소.

## 8. Usage example
```tsx
import { Sidebar } from "@/components/Sidebar";

export default function Example() {
  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar />
      <main className="flex-1 p-6 text-ink">content</main>
    </div>
  );
}
```

`Sidebar`는 데이터를 내부에서 import하므로 props 전달이 필요 없다. 부모는 높이를 차지하는 flex/grid 컨테이너만 제공하면 된다(`<aside>`가 `h-full w-[280px] shrink-0`).

## 9. Generation notes
- `Sidebar`는 named export다. `export default`가 아니므로 `import { Sidebar }`로 가져와야 한다.
- 루트 `<aside>`는 고정 폭 `w-[280px]`과 `shrink-0`을 가진다. 부모 레이아웃에서 사이드바가 줄어들지 않게 하려면 이 값을 유지할 것.
- `NavRow`/`SectionLabel`/`TagRow`는 export되지 않는 모듈 로컬 함수다. 외부에서 재사용하려면 [nav.md](./nav.md)의 canonical `NavItem`/`SectionLabel` 빌딩블록을 쓰되, Sidebar 자체는 자기 로컬 구현을 사용함에 유의.
- `CountPill`은 `count !== undefined`일 때만 렌더된다(`count === 0`도 렌더됨). `tone`이 `undefined`면 [CountPill](./badge.md)의 기본값 `positive`로 폴백.
- `urgent`는 `tone === "danger"`일 때만 true. `primaryNav`/`pagesNav` 기본 데이터에는 danger tone이 없으므로 urgent ring은 기본 상태에서 보이지 않는다.
- `tagDot`은 `Record<TagTone, string>`이라 4개 tone 키를 모두 채워야 빌드/타입체크 통과한다.
- import는 named: `import { primaryNav, pagesNav, tags, type NavEntry, type TagTone } from "@/data"`. `PillTone`은 `NavEntry`를 통해 간접 사용되며 직접 import되지 않는다.
- 아이콘은 `lucide-react`의 `ChevronsUpDown`, `LayoutGrid`(헤더) 및 `data.ts`에 정의된 각 `NavEntry.icon`. `@/` alias가 `src/`로 매핑되어야 import가 해소된다.
- 색 dot은 `rounded-[5px]`(임의값)이며 `rounded-pill`이 아니다 — 원이 아닌 둥근 사각형 의도.
