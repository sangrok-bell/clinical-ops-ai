# media (Avatar, Thumbnail)

## 1. Purpose
오프라인에서도 항상 렌더되는 미디어 프리미티브. `src`가 없으면 seed로부터 결정적(deterministic) 그라디언트를 만들어 `Avatar`는 이니셜 원형, `Thumbnail`은 둥근 사각형 파일 썸네일을 그린다 (네트워크 이미지 의존 없음).

## 2. File path + exports
- File: `src/components/ui/media.tsx` (verified source: `aurora-ui/src/components/media.tsx`)
- Exports: `export function Avatar(...)`, `export function Thumbnail(...)`
- Internal (non-exported) helpers: `GRADIENTS` 상수 배열, `pick(seed)` 해시 선택 함수

## 3. Props

### `Avatar`
| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | `string` | — | 예 | 이니셜 소스이자 그라디언트 seed. `name.charAt(0).toUpperCase()`가 표시되고 `aria-label`/`alt`로도 사용됨. |
| `size` | `number` | `48` | 아니오 | 정사각 픽셀 크기. width/height/fontSize(`size * 0.4`)에 인라인 style로 적용. |
| `src` | `string` | `undefined` | 아니오 | 지정 시 실제 `<img>` 렌더(그라디언트 대신). |
| `className` | `string` | `undefined` | 아니오 | `cn()`으로 루트 엘리먼트에 병합. |

### `Thumbnail`
| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `seed` | `string` | — | 예 | 그라디언트 결정용 해시 seed (텍스트는 표시되지 않음). |
| `size` | `number` | `48` | 아니오 | 정사각 픽셀 크기. width/height에 인라인 style로 적용. |
| `src` | `string` | `undefined` | 아니오 | 지정 시 실제 `<img>` 렌더(그라디언트 대신). |
| `className` | `string` | `undefined` | 아니오 | `cn()`으로 루트 엘리먼트에 병합. |

> 두 컴포넌트 모두 `disabled` 같은 상태 prop이 없는 순수 표시용(display-only) 프리미티브다.

## 4. Variants & states
미디어 프리미티브는 인터랙티브하지 않으므로 hover/active/focus-visible/disabled 상태가 **없다**. 분기는 `src` 유무 하나뿐이다.

| Component | 분기 | 렌더 결과 |
| --- | --- | --- |
| `Avatar` | `src` 없음 (기본) | `<div>` — `linear-gradient(135deg, a, b)` 배경 + 흰색 이니셜 1글자, `rounded-full`. |
| `Avatar` | `src` 있음 | `<img>` — `object-cover`, `rounded-full`. |
| `Thumbnail` | `seed` 만 (기본) | 빈 `<div>` — 그라디언트 채움, `rounded-xl`. |
| `Thumbnail` | `src` 있음 | `<img>` — `object-cover`, `rounded-xl`. |

그라디언트 색은 Aurora 토큰이 아니라 내부 `GRADIENTS` 팔레트의 raw hex 쌍이며, `pick(seed)`가 `seed`를 31-base 해시하여 `GRADIENTS.length`로 모듈러 인덱싱한다 → 같은 seed는 항상 같은 색.

## 5. Design tokens used
이 컴포넌트는 **색상 토큰을 거의 쓰지 않는다**(상태 전달용이 아니라 장식용 미디어이기 때문). 사용하는 디자인 값:

| Token / class | 적용 위치 | 비고 |
| --- | --- | --- |
| `rounded-full` (= `rounded-pill`) | `Avatar` 컨테이너/`<img>` | 원형. 토큰표는 [../01-tokens.md](../01-tokens.md) 참고. |
| `rounded-xl` | `Thumbnail` 컨테이너/`<img>` | 카드/토스트 라운드보다 작은 썸네일 라운드. 토큰표는 [../01-tokens.md](../01-tokens.md) 참고. |
| `text-white` | `Avatar` 이니셜 | 그라디언트 위 이니셜은 의도적으로 white (포화 배경 위 텍스트의 가독성 우선). `text-onaccent`가 아닌 raw white를 source가 사용함. |

> 색을 상태 신호로 쓰지 않으므로 `brand`/`positive`/`danger` 등 액센트 토큰은 적용되지 않는다. 그라디언트는 `bg-brand-gradient` 같은 토큰이 아니라 인라인 `backgroundImage`(raw hex)이다 — 토큰과 혼동하지 말 것.

링/보더 처리:
| Class | 적용 | 비고 |
| --- | --- | --- |
| `ring-2 ring-white/10` | `Avatar` (두 분기) | Aurora 액센트 ring 토큰이 아닌 white/10 미세 테두리. |
| `ring-1 ring-white/10` | `Thumbnail` (두 분기) | 동일. |
| `shrink-0` | 두 컴포넌트 루트 | flex 행에서 찌그러짐 방지(레이아웃 유틸, 토큰 아님). |
| `object-cover` | `<img>` 분기 | 이미지 크롭 방식(레이아웃 유틸). |

## 6. Composition
- **다른 컴포넌트를 렌더하지 않는다.** `Avatar`/`Thumbnail`은 leaf 프리미티브로, 내부에서 `cn()`(`../lib/utils.ts`)만 사용한다.
- **소비처(상위 컴포지션):** [NotificationPanel](./notification-panel.md)이 각 history 행의 우측 미디어로 이 둘을 렌더한다.
- **소비하는 데이터 타입:** 직접 import하지는 않지만, 상위에서 `HistoryItem.trailing` 판별 union으로부터 props가 공급된다 — `{ type: "thumb", seed }` → `<Thumbnail seed={...} />`, `{ type: "avatar", name }` → `<Avatar name={...} />`. 타입 정의는 [../02-data-contracts.md](../02-data-contracts.md)의 `HistoryItem` 섹션 참고.

## 7. Accessibility
- **focus ring 없음**: 인터랙티브 엘리먼트가 아니므로 `focus-visible:ring-*`을 적용하지 않는다. (클릭 가능한 미디어로 만들려면 상위에서 [Button](./button.md)/[IconButton](./nav.md) 등으로 감쌀 것.)
- **aria**:
  - `Avatar` 그라디언트 분기: `aria-label={name}` (이니셜만으로는 전체 이름을 알 수 없으므로).
  - `Avatar` `<img>` 분기: `alt={name}`.
  - `Thumbnail` 그라디언트 분기: `aria-hidden` (의미 없는 장식).
  - `Thumbnail` `<img>` 분기: `alt=""` + `aria-hidden` (장식 이미지).
- **color-is-not-the-only-signal**: 그라디언트 색은 식별을 위한 장식일 뿐, 상태를 의미하지 않는다. `Avatar`는 이니셜 글자가 비-색상 backstop 역할을 하고, `Thumbnail`은 의도적으로 `aria-hidden`이라 색상에 의미를 싣지 않는다.
- **hit area**: 기본 `size=48`이면 48x48px로 권장 터치 타깃을 충족하지만, 표시용이라 자체 핸들러는 없다.

## 8. Usage example
```tsx
import { Avatar, Thumbnail } from "@/components/ui/media";

export function Example() {
  return (
    <div className="flex items-center gap-3">
      {/* 오프라인 그라디언트 이니셜 아바타 */}
      <Avatar name="Jess" />

      {/* 작은 사이즈 */}
      <Avatar name="Derek" size={32} />

      {/* 실제 이미지가 있을 때 */}
      <Avatar name="Mike" src="https://example.com/mike.jpg" />

      {/* 파일 첨부 썸네일 (장식, aria-hidden) */}
      <Thumbnail seed="backpack" />
      <Thumbnail seed="graphicpack" size={40} />
    </div>
  );
}
```

`HistoryItem.trailing`(see [../02-data-contracts.md](../02-data-contracts.md))로부터 분기 렌더하는 패턴:
```tsx
{item.trailing.type === "thumb"
  ? <Thumbnail seed={item.trailing.seed} />
  : <Avatar name={item.trailing.name} />}
```

## 9. Generation notes
- **size는 Tailwind 클래스가 아니라 인라인 `style`로 들어간다.** `width`/`height`는 prop으로도 인라인 style로도 중복 지정되고, `Avatar`의 `fontSize`는 `size * 0.4`, 배경은 `backgroundImage: linear-gradient(135deg, a, b)`. Tailwind `size-*` 유틸로 대체하지 말 것 — 임의 `size` 숫자를 지원해야 하므로 인라인 style가 필수다.
- **`pick()`의 해시는 결정적이어야 한다.** `h = (h * 31 + charCodeAt) >>> 0` 후 `GRADIENTS.length`로 모듈러. `>>> 0`(unsigned 32-bit)를 빼먹으면 음수 인덱스가 나올 수 있다. 같은 seed → 같은 색을 보장하는 핵심이다.
- **`GRADIENTS`는 6쌍의 raw hex이며 토큰이 아니다.** Aurora 그라디언트 토큰(`bg-brand-gradient` 등)으로 치환하지 말 것 — seed별 다양성이 깨진다.
- **ring은 `ring-white/10`이지 액센트 ring 토큰이 아니다.** `Avatar`는 `ring-2`, `Thumbnail`은 `ring-1`로 두께가 다르다.
- **라운드가 다르다**: `Avatar` = `rounded-full`, `Thumbnail` = `rounded-xl`. 바꾸면 시각적 의미(사람 vs 파일)가 무너진다.
- **`<img>` 분기에서도 `cn(..., className)`을 마지막에 둔다** — 호출자 override가 base 클래스보다 우선되도록(tailwind-merge 동작).
- **aria가 분기마다 다르다**: `Avatar`는 이름을 노출(`aria-label`/`alt={name}`), `Thumbnail`은 숨김(`aria-hidden`, `alt=""`). 이 비대칭을 유지해야 스크린리더가 깔끔하게 읽는다.
- export는 named export 두 개뿐 — default export가 없다. barrel(`index.ts`)도 `export { Avatar, Thumbnail } from "./components/media"` 형태다.
