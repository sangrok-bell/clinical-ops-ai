# 02 · 데이터 계약 (Data Contracts)

이 문서는 AURORA 대시보드의 모든 컴포넌트가 공유하는 **TypeScript 타입과 mock 데이터**를 정의한다.
화면(screens)과 컴포넌트가 서로 다른 모양의 데이터를 가정하지 않도록, 모든 형태(shape)는 여기서 한 곳에 모아 선언한다.

- 공유 enum(`PillTone`, `ToastVariant`, `TagTone`)은 `src/types.ts`에 위치한다.
- 도메인 타입 + mock 배열(`NavEntry`, `HistoryItem`, `primaryNav`, `pagesNav`, `tags`, `history`)은 `src/data.ts`에 위치한다.
- 전체 구조는 [00-architecture.md](./00-architecture.md)를 참고한다.
- 디자인 토큰(`bg-positive`, `text-ink` 등)은 [01-tokens.md](./01-tokens.md)를 참고한다.

> 규칙: 색은 **상태만** 전달하며 항상 비색상 백업(텍스트/아이콘/ring/underline)을 동반한다.
> 아래의 `tone`/`variant` 값은 모두 토큰 색으로 매핑되지만, 컴포넌트는 색 외에 라벨/카운트/아이콘으로도 의미를 드러내야 한다.

---

## 1. 단순 union 타입

### `PillTone`

> 파일: `src/data.ts` (그리고 `aurora-ui/src/types.ts`에도 동일 선언)

카운트 pill의 톤을 나타낸다. [CountPill](./components/badge.md)과 [NavEntry](#3-naventry)의 `tone` 필드가 사용한다.

```ts
export type PillTone = "positive" | "magenta" | "danger";
```

| 값 | 의미 | 매핑 토큰 (참고 [01-tokens.md](./01-tokens.md)) |
| --- | --- | --- |
| `"positive"` | 정상 / 진행 중 카운트 | `bg-positive` |
| `"magenta"` | 주목 / 미확인 카운트 | `bg-magenta` |
| `"danger"` | 긴급 카운트 (urgent ring 동반) | `bg-danger` |

**소비처:** [CountPill (badge.md)](./components/badge.md), [NavEntry](#3-naventry) → [Sidebar (sidebar.md)](./components/sidebar.md), [FloatingToolbar (floating-toolbar.md)](./components/floating-toolbar.md)

---

### `TagTone`

> 파일: `src/data.ts` (그리고 `aurora-ui/src/types.ts`에도 동일 선언)

사이드바 하단 태그 행(우선순위 태그)의 톤을 나타낸다.

```ts
export type TagTone = "danger" | "warning" | "caution" | "positive";
```

| 값 | 의미 | 매핑 토큰 (참고 [01-tokens.md](./01-tokens.md)) |
| --- | --- | --- |
| `"danger"` | High Priority | `text-danger` / `bg-danger` |
| `"warning"` | Medium Priority | `text-warning` / `bg-warning` |
| `"caution"` | Low Priority | `text-caution` / `bg-caution` |
| `"positive"` | On Standby | `text-positive` / `bg-positive` |

**소비처:** [Sidebar (sidebar.md)](./components/sidebar.md)의 태그 행. 데이터는 아래 [`tags` 배열](#tags)에서 공급된다.

---

### `ToastVariant`

> 파일: `aurora-ui/src/types.ts`

토스트의 시각적 variant를 나타낸다.

```ts
export type ToastVariant = "success" | "info" | "ghost";
```

| 값 | 의미 | 매핑 (참고 [01-tokens.md](./01-tokens.md)) |
| --- | --- | --- |
| `"success"` | 성공 알림 | `bg-success-gradient` / `shadow-glow-green` |
| `"info"` | 정보 알림 | `bg-info-gradient` / `shadow-glow-blue` |
| `"ghost"` | 저강도 / 중립 알림 | `glass` |

**소비처:** [Toast (toast.md)](./components/toast.md), [ToastStack (toast-stack.md)](./components/toast-stack.md).
`ToastStack`은 이 세 가지 variant 상태를 모두 렌더한다.

---

## 2. 객체 타입 한눈에 보기

| 타입 | 파일 | 핵심 필드 | 주 소비 컴포넌트 |
| --- | --- | --- | --- |
| `PillTone` | `src/data.ts` | union | [CountPill](./components/badge.md), [Sidebar](./components/sidebar.md) |
| `TagTone` | `src/data.ts` | union | [Sidebar](./components/sidebar.md) |
| `ToastVariant` | `aurora-ui/src/types.ts` | union | [Toast](./components/toast.md), [ToastStack](./components/toast-stack.md) |
| `NavEntry` | `src/data.ts` | `icon, label, count?, tone?, active?` | [Sidebar](./components/sidebar.md) ← [NavItem](./components/nav.md) |
| `HistoryItem` | `src/data.ts` | `actor, time, verb, primary, connector, secondary, trailing` | [NotificationPanel](./components/notification-panel.md) ← [Avatar/Thumbnail](./components/media.md) |

---

## 3. `NavEntry`

> 파일: `src/data.ts`

사이드바의 네비게이션 행 하나를 표현한다. [NavItem (nav.md)](./components/nav.md)이 이 형태를 렌더하고, [Sidebar (sidebar.md)](./components/sidebar.md)가 배열을 매핑한다.

```ts
import type { LucideIcon } from "lucide-react";

export type NavEntry = {
  icon: LucideIcon;
  label: string;
  count?: number;
  tone?: PillTone;
  active?: boolean;
};
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `icon` | `LucideIcon` | 예 | 행 좌측 아이콘. `lucide-react`에서 import한 컴포넌트(예: `Folder`, `Users`). |
| `label` | `string` | 예 | 행 텍스트. `text-ink`로 표시. |
| `count` | `number` | 아니오 | 우측 [CountPill](./components/badge.md)에 표시할 숫자. 없으면 pill 미표시. |
| `tone` | [`PillTone`](#pilltone) | 아니오 | `count` pill의 톤. `count`가 있을 때만 의미가 있다. |
| `active` | `boolean` | 아니오 | 현재 선택 행 여부. 활성 시 비색상 백업(배경/ring)으로 강조. |

**소비처:** [Sidebar (sidebar.md)](./components/sidebar.md) → 내부적으로 [NavItem (nav.md)](./components/nav.md) 사용. 데이터는 [`primaryNav`](#primarynav) / [`pagesNav`](#pagesnav)에서 공급.

---

## 4. `HistoryItem`

> 파일: `src/data.ts`

알림 패널의 활동 이력(history) 행 하나를 표현한다. 문장은
`{actor} {verb} {primary} {connector} {secondary}` 형태로 조립되며, 행 우측에는 판별 union `trailing`이 thumbnail 또는 avatar를 렌더한다.

```ts
export type HistoryItem = {
  actor: string;
  time: string;
  verb: string;
  primary: string;
  connector: string;
  secondary: string;
  trailing:
    | { type: "thumb"; seed: string }
    | { type: "avatar"; name: string };
};
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `actor` | `string` | 예 | 행위 주체 이름 (예: `"Mike"`). |
| `time` | `string` | 예 | 상대 시각 라벨 (예: `"2h ago"`). `text-dim`. |
| `verb` | `string` | 예 | 동작 (예: `"Add"`, `"Assigned"`). |
| `primary` | `string` | 예 | 대상 (예: `"Backpack.img"`). 강조 텍스트. |
| `connector` | `string` | 예 | 연결어 (예: `"to"`). |
| `secondary` | `string` | 예 | 두 번째 대상 (예: `"Files"`, `"Jess"`). |
| `trailing` | 판별 union (아래) | 예 | 행 우측 미디어. `type`으로 분기. |

### `trailing` 판별 union (discriminated union)

판별자(discriminant)는 `type` 필드다.

| `type` | 추가 필드 | 타입 | 렌더 컴포넌트 |
| --- | --- | --- | --- |
| `"thumb"` | `seed` | `string` | [Thumbnail (media.md)](./components/media.md) — `seed`로 결정적(offline) 그라디언트 썸네일 생성 |
| `"avatar"` | `name` | `string` | [Avatar (media.md)](./components/media.md) — `name`의 이니셜로 offline 그라디언트 아바타 생성 |

> 두 분기는 상호 배타적이다. `type === "thumb"`이면 `seed`만, `type === "avatar"`이면 `name`만 존재한다.
> 소비 컴포넌트는 `trailing.type`으로 분기한 뒤 해당 필드에 접근해야 타입 안전하다.

**소비처:** [NotificationPanel (notification-panel.md)](./components/notification-panel.md) → 각 행이 [Avatar 또는 Thumbnail (media.md)](./components/media.md)를 렌더. 데이터는 [`history`](#history) 배열에서 공급.

---

## 5. Export된 mock 배열

모든 배열은 `src/data.ts`에서 named export로 노출된다.

### `primaryNav`

> 타입: `NavEntry[]` — 사이드바 상단 그룹.

```ts
export const primaryNav: NavEntry[] = [
  { icon: Lightbulb, label: "Activity", count: 12, tone: "positive" },
  { icon: CircleUser, label: "My profile" },
];
```

| label | icon | count | tone | active |
| --- | --- | --- | --- | --- |
| Activity | `Lightbulb` | 12 | `positive` | — |
| My profile | `CircleUser` | — | — | — |

**소비처:** [Sidebar (sidebar.md)](./components/sidebar.md).

---

### `pagesNav`

> 타입: `NavEntry[]` — 사이드바 "Pages" 그룹.

```ts
export const pagesNav: NavEntry[] = [
  { icon: LayoutGrid, label: "Dashboard" },
  { icon: Folder, label: "Tasks", count: 25, tone: "positive", active: true },
  { icon: Users, label: "Teams" },
  { icon: CalendarDays, label: "Calendar" },
  { icon: MessageSquare, label: "Messages", count: 3, tone: "magenta" },
];
```

| label | icon | count | tone | active |
| --- | --- | --- | --- | --- |
| Dashboard | `LayoutGrid` | — | — | — |
| Tasks | `Folder` | 25 | `positive` | `true` |
| Teams | `Users` | — | — | — |
| Calendar | `CalendarDays` | — | — | — |
| Messages | `MessageSquare` | 3 | `magenta` | — |

**소비처:** [Sidebar (sidebar.md)](./components/sidebar.md). `active: true`인 `Tasks`가 선택 상태를 시연한다.

---

### `tags`

> 타입: `{ label: string; tone: TagTone }[]` — 사이드바 하단 우선순위 태그.

```ts
export const tags: { label: string; tone: TagTone }[] = [
  { label: "High Priority", tone: "danger" },
  { label: "Medium Priority", tone: "warning" },
  { label: "Low Priority", tone: "caution" },
  { label: "On Standby", tone: "positive" },
];
```

| label | tone ([`TagTone`](#tagtone)) |
| --- | --- |
| High Priority | `danger` |
| Medium Priority | `warning` |
| Low Priority | `caution` |
| On Standby | `positive` |

**소비처:** [Sidebar (sidebar.md)](./components/sidebar.md).

---

### `history`

> 타입: `HistoryItem[]` — 알림 패널 활동 이력.

```ts
export const history: HistoryItem[] = [
  { actor: "Mike",  time: "2h ago", verb: "Add",      primary: "Backpack.img",   connector: "to", secondary: "Files", trailing: { type: "thumb",  seed: "backpack" } },
  { actor: "Lily",  time: "2h ago", verb: "Assigned", primary: "Homepage design", connector: "to", secondary: "Jess",  trailing: { type: "avatar", name: "Jess" } },
  { actor: "Helen", time: "3h ago", verb: "Assigned", primary: "Social page",      connector: "to", secondary: "Derek", trailing: { type: "avatar", name: "Derek" } },
  { actor: "Mike",  time: "4h ago", verb: "Add",      primary: "GraphicPack",      connector: "to", secondary: "Files", trailing: { type: "thumb",  seed: "graphicpack" } },
  { actor: "Tom",   time: "5h ago", verb: "Assigned", primary: "UI",               connector: "to", secondary: "Henry", trailing: { type: "avatar", name: "Henry" } },
];
```

| actor | time | verb | primary | connector | secondary | trailing.type | trailing 값 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mike | 2h ago | Add | Backpack.img | to | Files | `thumb` | seed `"backpack"` |
| Lily | 2h ago | Assigned | Homepage design | to | Jess | `avatar` | name `"Jess"` |
| Helen | 3h ago | Assigned | Social page | to | Derek | `avatar` | name `"Derek"` |
| Mike | 4h ago | Add | GraphicPack | to | Files | `thumb` | seed `"graphicpack"` |
| Tom | 5h ago | Assigned | UI | to | Henry | `avatar` | name `"Henry"` |

**소비처:** [NotificationPanel (notification-panel.md)](./components/notification-panel.md). `thumb` 행은 [Thumbnail](./components/media.md), `avatar` 행은 [Avatar](./components/media.md)로 렌더된다.

---

## 6. 소비 매핑 요약 (cross-link)

| 데이터 / 타입 | 소비 컴포넌트 spec |
| --- | --- |
| `PillTone` | [badge.md](./components/badge.md), [sidebar.md](./components/sidebar.md), [floating-toolbar.md](./components/floating-toolbar.md) |
| `TagTone` / `tags` | [sidebar.md](./components/sidebar.md) |
| `ToastVariant` | [toast.md](./components/toast.md), [toast-stack.md](./components/toast-stack.md) |
| `NavEntry` / `primaryNav` / `pagesNav` | [nav.md](./components/nav.md), [sidebar.md](./components/sidebar.md) |
| `HistoryItem` / `history` | [notification-panel.md](./components/notification-panel.md), [media.md](./components/media.md) |

전체 컴포넌트 인벤토리와 레이아웃은 [00-architecture.md](./00-architecture.md)와 [app-shell.md](./components/app-shell.md)를 참고한다.
