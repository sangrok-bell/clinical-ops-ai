# NotificationPanel

## 1. Purpose
탭으로 전환되는 알림/활동 패널. `History` 탭은 [HistoryItem](../02-data-contracts.md) 배열을 행으로 렌더링하고, `Design Tips` 탭은 빈 상태 placeholder를 보여준다. [Card](./card.md) 위에 [Tab](./nav.md)·[Avatar/Thumbnail](./media.md)·[Dot](./badge.md)을 조합한 composite다.

## 2. File path + exports
- 파일: `src/components/NotificationPanel.tsx`
- exports:
  - `NotificationPanel` (named export) — 패널 전체 셸. 내부 상태 `tab`를 직접 소유한다.
- 파일 내부 전용(미export) 헬퍼:
  - `HistoryRow` — 단일 [HistoryItem](../02-data-contracts.md) 행.
  - `Tab` — 패널 로컬 탭 버튼. (sidebar의 [Tab](./nav.md)과 이름은 같지만 별개 구현이며 `dot`·active underline을 가짐. 자세한 차이는 9. Generation notes 참고.)
  - `TabKey` 타입 = `"history" | "tips"`.

## 3. Props — full TypeScript interface table

### `NotificationPanel`
props 없음 (`NotificationPanel()`). 상태는 컴포넌트 내부 `useState<TabKey>("history")`로 관리하며 외부 제어 불가.

| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| — | — | — | — | props를 받지 않는다. 데이터는 `@/data`의 `history`를 직접 import하여 사용. |

### `HistoryRow` (internal)
| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| `item` | `HistoryItem` | — | yes | 한 행에 표시할 활동 데이터. [02-data-contracts.md](../02-data-contracts.md) 참고. |

### `Tab` (internal, 패널 전용)
| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| `active` | `boolean` | `undefined` | no | 현재 선택된 탭이면 `text-positive` + 하단 underline 표시. |
| `dot` | `boolean` | `undefined` | no | 라벨 우상단에 [Dot](./badge.md)을 절대배치로 표시(읽지 않은 알림 신호). |
| `onClick` | `() => void` | `undefined` | no | 탭 클릭 핸들러. |
| `children` | `string` | — | yes | 탭 라벨 텍스트(문자열 한정). |

## 4. Variants & states

### `NotificationPanel` (tab 상태)
| state | 동작/클래스 |
| --- | --- |
| `tab === "history"` (default) | `history.map(...)`로 [HistoryRow](#3-props--full-typescript-interface-table)들을 렌더 (`key={i}`). |
| `tab === "tips"` | `h-64` 빈 상태 박스, 가운데 정렬 `text-dim` placeholder 텍스트. |

### `Tab` (interactive)
| state | 클래스 / 동작 |
| --- | --- |
| default(비활성) | `text-ink/70` |
| hover | `hover:text-ink` |
| active | `text-positive` + 하단 `h-0.5 rounded-full bg-positive` underline(`absolute inset-x-0 -bottom-px`) |
| focus-visible | `focus-visible:text-ink` (기본 outline은 `outline-none`으로 제거; 색상 강조로 대체) |
| dot | `<Dot className="absolute -right-2.5 top-0.5" />` |
| disabled | 미지원 (disabled prop 없음) |

### `HistoryRow` (정적)
hover/active 상태 없음. trailing은 데이터 분기:
- `item.trailing.type === "thumb"` → `<Thumbnail seed={...} size={48} />`
- else (`"avatar"`) → `<Avatar name={...} size={32} />`

## 5. Design tokens used
모든 토큰은 [../01-tokens.md](../01-tokens.md)의 canonical 유틸리티이며, 색상은 상태 신호로만 사용한다.

| 토큰 | 적용 위치 |
| --- | --- |
| `bg-surface` | [Card](./card.md) 내부 기본 배경 (Card가 제공). |
| `shadow-card` | Card 엘리베이션 (Card가 제공). |
| `rounded-card` | Card 모서리 (Card가 제공). |
| `text-ink` | actor 이름·primary/secondary 강조 텍스트, 활성 탭 focus 색, 비활성 탭 hover 색. |
| `text-dim` | time(`, {time}`), verb/connector 본문, tips 빈 상태 텍스트, 비활성 탭 base(`text-ink/70` 형태로 ink 기반). |
| `text-positive` | 활성 `Tab` 라벨 색. |
| `bg-positive` | 활성 `Tab` 하단 underline 막대. |
| `bg-magenta` | `dot` 표시 시 [Dot](./badge.md) 내부 색 (Dot이 제공). |

비토큰 레이아웃/구분선: `border-white/5`(탭 하단 divider, Card border), `flex`/`gap-*`/`px-*`/`py-*`/`min-w-0`/`h-64` 등은 일반 Tailwind 유틸로 design token이 아니다.

## 6. Composition
이 composite가 렌더하는 컴포넌트 (각 spec 링크):
- [Card](./card.md) — 외곽 컨테이너 (`className="w-full max-w-[460px] p-2"`).
- [Tab](./nav.md) — 본 패널은 동일 이름의 **로컬** `Tab`을 사용한다. 시각/동작 규약은 nav의 Tab과 정렬되지만 구현은 파일 내부에 있다(9. Generation notes 참고).
- [Dot](./badge.md) — `Design Tips` 탭의 미확인 신호.
- [Avatar](./media.md) — actor 아바타(`size={48}`) 및 trailing avatar(`size={32}`).
- [Thumbnail](./media.md) — trailing 파일 썸네일(`size={48}`).

소비하는 데이터 타입 (전부 [../02-data-contracts.md](../02-data-contracts.md)):
- `HistoryItem` — `HistoryRow`의 `item` 형태.
- `history: HistoryItem[]` — `@/data`에서 직접 import한 mock 배열.
- `HistoryItem.trailing`의 discriminated union `{ type: "thumb"; seed } | { type: "avatar"; name }`로 trailing 렌더 분기.

## 7. Accessibility
- **Focus ring**: `Tab`은 기본 outline을 `outline-none`으로 제거하고 `focus-visible:text-ink` 색상 대비로 포커스를 표현한다. (CONTRACT의 `focus-visible:ring-2 focus-visible:ring-brand` 기본형과 다른 예외 — 9. Generation notes에 명시.)
- **color-is-not-the-only-signal**: 활성 탭은 `text-positive` 색뿐 아니라 하단 `bg-positive` underline이라는 비색상 백스톱을 함께 가진다 (WCAG 1.4.1).
- **aria**: [Avatar](./media.md)는 `aria-label={name}`을, [Thumbnail](./media.md)은 `aria-hidden`을 자체 제공. [Dot](./badge.md)은 장식 요소이므로 의미 전달이 필요하면 부모 탭에 `aria-label`(예: "Design Tips, unread")을 추가하는 것을 권장.
- **Hit area**: `Tab`은 `<button type="button">`이며 `pb-3`로 세로 클릭 영역을 확보. 탭 그룹은 `gap-8`로 충분히 분리.
- **시맨틱**: 행 텍스트는 `<p>`로 구성되고 actor/primary/secondary는 `font-semibold text-ink`로 시각적 위계를 만든다.

## 8. Usage example
```tsx
import { NotificationPanel } from "@/components/NotificationPanel";

export default function Example() {
  return (
    <div className="bg-canvas flex min-h-screen items-start justify-center p-8">
      <NotificationPanel />
    </div>
  );
}
```
> `NotificationPanel`은 props가 없고 `@/data`의 `history`를 직접 사용하므로 별도 데이터 주입 없이 그대로 렌더된다. 다른 데이터를 쓰려면 `data.ts`의 `history` 배열을 교체한다([../02-data-contracts.md](../02-data-contracts.md)).

## 9. Generation notes
- **로컬 `Tab` ≠ nav `Tab`**: 이 파일은 `components/ui/nav.tsx`에서 `Tab`을 import하지 않고 파일 하단에 자체 `Tab`을 정의한다. 본 패널의 `Tab`은 `dot`와 active underline을 가진 별개 구현이다. 시그니처는 `{ active?, dot?, onClick?, children: string }`이며 `children`은 반드시 string. 두 `Tab`을 혼동해 import로 대체하지 말 것.
- **Card 패딩 구조**: Card에 `p-2`만 주고, 탭 영역은 `px-4 pt-3`, 리스트는 `px-3 py-1`, 행은 `py-3`로 내부에서 별도 패딩을 잡는다. Card에 큰 패딩을 추가하면 divider 정렬이 깨진다.
- **divider 정렬**: 탭 그룹은 `border-b border-white/5`를 가지며 각 `Tab`은 `-mb-px`, active underline은 `-bottom-px`로 divider 라인에 정확히 겹친다. 이 음수 마진을 제거하면 underline이 divider와 어긋난다.
- **focus 규약 예외**: `Tab`은 `outline-none focus-visible:text-ink`를 쓴다. 다른 인터랙티브 요소의 기본형(`focus-visible:ring-2 focus-visible:ring-brand`)을 여기에 강제로 덮어쓰지 말 것(검증된 소스가 색상 기반 focus를 사용).
- **trailing 분기 누락 금지**: `item.trailing.type`이 `"thumb"`이면 [Thumbnail](./media.md)(`seed`), 아니면 [Avatar](./media.md)(`name`)다. `seed`/`name` 키가 union마다 다르므로 narrowing 없이 접근하면 TS 에러.
- **size 값 고정**: actor Avatar/Thumbnail은 `48`, trailing avatar는 `32`. media 컴포넌트의 size는 px 숫자(prop)이며 Tailwind 클래스가 아니다.
- **max-width**: 패널 폭은 `max-w-[460px]`. App 셸에서 가로 폭은 부모가 제어하되 이 상한을 넘기지 않는다([../00-architecture.md](../00-architecture.md) 참고).
- **import 경로**: `@/components/ui/card`, `@/components/ui/badge`(Dot), `@/components/ui/media`(Avatar, Thumbnail), `@/data`(history, HistoryItem), `@/lib/utils`(cn). `@/` 별칭은 `src/`로 매핑되어야 빌드된다.
