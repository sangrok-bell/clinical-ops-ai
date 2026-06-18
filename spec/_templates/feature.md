<!-- 새 기능 스펙 템플릿. 복사 → spec/features/<kebab>.md. Plan 단계 산출물.
     acceptance criteria가 Tier 2 eval의 채점표가 된다. -->

# 기능: <이름>

## 무엇 / 왜
<한 단락: 사용자 가치, 문제>

## 화면 / 흐름
<라우트, 주요 화면, 사용자 흐름>

## 사용/추가 컴포넌트
- 재사용: [Button](../components/button.md), [Card](../components/card.md), ...
- 신규: `<New>` → 새 스펙 [../components/<new>.md](../components/<new>.md) (component 템플릿으로)

## 데이터
<새 타입/필드 → [02-data-contracts.md](../02-data-contracts.md)에 추가. mock 위치.>

## Acceptance criteria (Tier 2 채점표)
- [ ] AC1: <Given … When … Then …> — 관찰 가능한 기준
- [ ] AC2: <…>
- [ ] AC3: <접근성/엣지케이스 포함>

## Out of scope
<이번에 안 하는 것>
