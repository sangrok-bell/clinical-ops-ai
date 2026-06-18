# Toast

## 1. Purpose
알림 한 건을 표시하는 토스트 카드. 아이콘 + 제목 + 메시지 + 닫기 버튼으로 구성되며, `variant`에 따라 success / info / ghost 세 가지 시각 톤을 가진다. 여러 상태를 한 화면에 쌓아 보여주는 데모는 [ToastStack](./toast-stack.md) 참고.

## 2. File path + exports
- File: `components/ui/toast.tsx`
- Exports: `Toast` (named export, function component)
- 내부 전용: `ToastVariant`별 스타일 맵(`VARIANTS`)과 `VariantStyle` 타입은 export 되지 않는다.

## 3. Props
`Toast`는 인라인 prop 타입을 가진다 (별도 `interface` 선언 없음).

| name | type | default | required | description |
| --- | --- | --- | --- | --- |
| `variant` | `ToastVariant` (`"success" \| "info" \| "ghost"`) | `"success"` | no | 토스트 시각 톤. `VARIANTS` 맵에서 wrap/iconBox/title/subtitle/close 클래스와 아이콘을 결정 |
| `title` | `string` | — | yes | 굵은 제목 텍스트 |
| `message` | `string` | — | yes | 보조 메시지. 한 줄로 `truncate` 처리됨 |
| `onClose` | `() => void` | `undefined` | no | 닫기 버튼 클릭 핸들러. 없으면 버튼은 렌더되되 동작이 비어 있음 |
| `className` | `string` | `undefined` | no | 루트 `div`에 `cn()`으로 병합되는 추가 클래스 |

`variant` 타입은 [02-data-contracts.md](../02-data-contracts.md)와 동일 소스(`src/types.ts`)의 `ToastVariant`를 사용한다.

## 4. Variants & states
변형은 `VARIANTS` 맵으로 정의되며, 각 변형이 wrap / iconBox / title / subtitle / close 클래스와 아이콘(`LucideIcon`)을 묶는다.

| variant | wrap | iconBox | title | subtitle | close | icon |
| --- | --- | --- | --- | --- | --- | --- |
| `success` (default) | `bg-success-gradient shadow-glow-green` | `bg-[rgba(16,35,26,0.22)] text-[#10231A]` | `text-[#10231A]` | `text-[#0E2018]` | `text-[#10231A]/70 hover:text-[#10231A]` | `CheckCheck` |
| `info` | `bg-info-gradient shadow-glow-blue` | `bg-white/18 text-[#08102A]` | `text-[#08102A]` | `text-[#0A1228]` | `text-[#08102A]/70 hover:text-[#08102A]` | `BellOff` |
| `ghost` | `glass border border-white/10 shadow-glow-teal` | `bg-[rgba(63,207,142,0.16)] text-positive` | `text-ink` | `text-[#9FBFB0]` | `text-ink/60 hover:text-ink` | `CheckCheck` |

상태:
- **default**: 루트에 `animate-toast-in`이 적용되어 마운트 시 진입 애니메이션 재생.
- **hover (닫기 버튼)**: `close` 클래스의 `hover:` 토큰으로 닫기 아이콘 색이 더 진해짐 (`transition-colors`).
- **active / disabled**: 별도 처리 없음 (닫기 버튼에 `disabled` 상태 없음).
- **focus-visible**: 소스에는 닫기 버튼에 focus ring 클래스가 명시돼 있지 않음. CONTRACT의 "모든 인터랙티브 요소는 `focus-visible:ring-2 focus-visible:ring-brand`" 규칙을 충족하려면 day-of 생성 시 close `button`에 추가 권장 (Generation notes 참고).

## 5. Design tokens used
아래 Aurora 토큰 유틸리티만 사용한다. 정의는 [../01-tokens.md](../01-tokens.md) 참고.

| token | 적용 위치 |
| --- | --- |
| `bg-success-gradient` | success 변형 wrap 배경 |
| `bg-info-gradient` | info 변형 wrap 배경 |
| `glass` | ghost 변형 wrap (반투명 유리 표면) |
| `shadow-glow-green` | success 변형 글로우 |
| `shadow-glow-blue` | info 변형 글로우 |
| `shadow-glow-teal` | ghost 변형 글로우 |
| `text-positive` | ghost 변형 iconBox 아이콘 색 |
| `text-ink` | ghost 변형 title 색 및 close base/hover |
| `rounded-toast` | 루트 `div` 반경 (16) |
| `animate-toast-in` | 루트 `div` 진입 애니메이션 |

> 참고: `bg-[rgba(...)]`, `text-[#08102A]`, `text-[#9FBFB0]`, `bg-white/18`, `border-white/10` 등은 success/info 그라디언트 표면 위에서 AA 대비를 맞추기 위한 명시적 arbitrary 값으로, 토큰이 아니라 변형 내부 고정 색이다. 소스 주석대로 subtitle 전경색은 opacity가 아닌 solid 색을 써서 대비를 확보한다.

## 6. Composition
- 다른 Aurora 컴포넌트를 렌더하지 않는다 (leaf 프리미티브). 아이콘만 `lucide-react`의 `CheckCheck`, `BellOff`, `X`를 사용.
- 소비 데이터 타입: `ToastVariant` — [../02-data-contracts.md](../02-data-contracts.md)의 톤/변형 enum 계열과 동일 소스(`src/types.ts`).
- 이 컴포넌트를 합성하는 상위: [ToastStack](./toast-stack.md)이 세 가지 `Toast` 상태를 나열하고, [NotificationPanel](./notification-panel.md) 흐름과 함께 알림 UI를 구성한다. 액션 버튼이 필요한 화면에서는 [Button](./button.md)과 나란히 배치된다.

## 7. Accessibility
- 루트 `div`에 `role="status"` — 스크린리더에 라이브 영역으로 알림.
- 닫기 `button`은 `type="button"` + `aria-label="Dismiss notification"`로 아이콘 전용 버튼의 접근 가능한 이름 제공.
- 색이 유일한 신호가 아님: 각 변형이 의미 아이콘(`CheckCheck` 성공/확인, `BellOff` 음소거/정보)을 동반하고 title/message 텍스트로 내용을 전달한다.
- Hit area: 닫기 버튼은 `p-1`로 `size-5` 아이콘 둘레에 패딩을 두어 클릭 영역 확보, 아이콘 박스는 `size-11`.
- focus ring: 소스에는 미포함. 키보드 접근성을 위해 close 버튼에 `focus-visible:ring-2 focus-visible:ring-brand` 추가 권장 (CONTRACT 규칙).

## 8. Usage example
```tsx
import { Toast } from "@/components/ui/toast";

export function Example() {
  return (
    <div className="flex w-80 flex-col gap-3">
      <Toast
        variant="success"
        title="Backup complete"
        message="All 1,204 files synced to the cloud."
        onClose={() => console.log("dismiss success")}
      />
      <Toast
        variant="info"
        title="Notifications muted"
        message="You won't be disturbed until 9:00 AM."
        onClose={() => console.log("dismiss info")}
      />
      <Toast
        variant="ghost"
        title="Saved as draft"
        message="Your changes are stored locally."
        onClose={() => console.log("dismiss ghost")}
      />
    </div>
  );
}
```

## 9. Generation notes
- `variant` 기본값은 `"success"`. 생략 시 success 그라디언트가 적용된다.
- `message`는 루트가 아니라 `min-w-0 flex-1` 컨테이너 안에서 `truncate` 되므로, 잘림이 동작하려면 부모가 폭을 제한해야 한다 (예: 고정 폭 또는 flex 컨테이너).
- success/info 변형의 title·subtitle·iconBox·close 색은 그라디언트 위 대비를 위한 **고정 arbitrary 색**이다. 토큰으로 치환하지 말 것 — 흰 텍스트를 쓰면 밝은 그라디언트에서 대비가 깨진다 (CONTRACT: 채도 높은 fill 위에는 어두운 텍스트).
- ghost 변형은 `glass` + `border border-white/10`이라 어두운 표면 위에 올려야 의도대로 보인다.
- 아이콘은 `strokeWidth={2.5}`, 크기 `size-5`로 고정.
- `cn()`은 `../lib/utils`(빌드 후 `@/lib/utils`)에서 import. 루트 클래스 순서는 `cn("animate-toast-in flex items-center gap-3 rounded-toast p-3 pr-4", v.wrap, className)`로, `className`이 가장 뒤에 와 사용자 오버라이드가 가능하다.
- `onClose`가 없어도 닫기 버튼은 렌더된다(클릭 시 no-op). 닫기 자체 로직(상태 제거)은 상위 [ToastStack](./toast-stack.md)/컨테이너 책임.
- focus ring이 소스에 없으므로, 키보드 접근성을 강제하려면 close `button` className에 `focus-visible:ring-2 focus-visible:ring-brand`를 더한다.
