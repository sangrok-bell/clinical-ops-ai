<!-- 새 컴포넌트 스펙 템플릿. 복사 → spec/components/<kebab>.md. 9개 섹션 모두 채운다.
     CONTRACT.md를 준수하고, 작성 후 `npm run eval`로 검증한다. -->

# `<ComponentName>`

## 1. Purpose
<1-2줄: 무엇이고 언제 쓰나>

## 2. File & exports
- File: `src/components/ui/<file>.tsx` (또는 `src/components/<File>.tsx`)
- Exports: `<Name>` (named) / cva 변형이 있으면 `<name>Variants`

## 3. Props
| prop | type | default | required | 설명 |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |
<공유 타입은 [02-data-contracts.md](../02-data-contracts.md) 링크>

## 4. Variants & states
default / hover / active / `focus-visible` / disabled (해당 시). cva 변형 표.

## 5. Design tokens used
<각 토큰을 코드체로, [01-tokens.md](../01-tokens.md) 참조. 닫힌 집합 밖 금지.>
| token | 적용 위치 |
|---|---|

## 6. Composition
<렌더하는 형제 컴포넌트를 모두 링크: [Button](./button.md) 등. 소비 데이터 타입 링크.>

## 7. Accessibility
focus ring(`focus-visible:ring-2 focus-visible:ring-brand`), aria, 색-단독-금지(비색상 보조), 히트영역.

## 8. Behavior (testable)
<Given/When/Then 케이스 나열. 각 케이스 = `<file>.test.tsx`의 테스트 1개(Tier 1).
 role/text/aria/상호작용 우선, Tailwind 클래스 문자열보다 동작 위주. TDD: 여기서 먼저 적고 → 테스트로 인코딩(red) → 구현으로 green.>
- [ ] required prop 렌더 → <관찰 가능한 결과>
- [ ] <상호작용> → <결과> (예: 닫기 클릭 시 `onClose` 호출)
- [ ] <상태> → <aria/role 변화> (예: active면 `aria-current="page"`)

## 9. Usage example
```tsx
// copy-paste runnable
```

## 10. Generation notes
<실제로 build/render/test 되게 하는 주의점(arbitrary 값, import alias 등).>
