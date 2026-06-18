# Aurora 스펙 스위트

Claude Code가 **당일 읽고 일관되게 생성**하도록, 검증된 코드에서 역추출한 긴밀히 연결된 명세 모음입니다.
핵심 원칙: **명세 = 검증된 현실의 투영** (추측 금지). 명세를 먼저 쓰더라도 생성→검증 후 실제 코드로
재정렬(re-derive)해 drift를 0으로 유지합니다.

## 읽는 순서
1. [CONTRACT.md](./CONTRACT.md) — **불변 backbone** (스택·파일구조·토큰 닫힌집합·컴포넌트 인벤토리·데이터계약·컨벤션·교차링크 규약). 모든 명세가 이걸 지킨다.
2. [00-architecture.md](./00-architecture.md) — 아키텍처: 셋업·파일 구조·스타일 파이프라인·검증 루프.
3. [01-tokens.md](./01-tokens.md) — 디자인 토큰 닫힌 레퍼런스 (서피스/텍스트/액센트/반경/그림자/그라디언트/모션).
4. [02-data-contracts.md](./02-data-contracts.md) — `data.ts`/`types.ts` 타입 + mock 배열 계약.
5. 프리미티브: [button](./components/button.md) · [badge](./components/badge.md) · [card](./components/card.md) · [media](./components/media.md) · [toast](./components/toast.md) · [nav](./components/nav.md)
6. 컴포지트: [sidebar](./components/sidebar.md) · [floating-toolbar](./components/floating-toolbar.md) · [notification-panel](./components/notification-panel.md) · [toast-stack](./components/toast-stack.md)
7. 셸: [app-shell](./components/app-shell.md)

## 새 기능을 얹을 때
[PROCESS.md](./PROCESS.md)의 **Grounded Spec Loop**를 따른다. 새 컴포넌트/기능은 [`_templates/`](./_templates/)에서
시작하고, 매 변경마다 **Tier 0 eval**(`npm run eval`)과 필요 시 **Tier 2 acceptance eval**로 게이트한다.

## 무엇이 무엇과 연결되나 (요약)
```
CONTRACT(불변) ── 토큰 ──► 01-tokens.md ◄── 모든 컴포넌트 스펙이 토큰 참조
       │                                         │
       ├── 인벤토리 ──► 컴포넌트 스펙 ◄── 서로 composition 링크로 연결
       │                                         │
       └── 데이터계약 ─► 02-data-contracts.md ◄── 컴포넌트가 소비하는 타입
```
이 연결의 무결성(토큰 폐합·링크 폐합·스펙↔코드 일치)은 [`eval/check.mjs`](../eval/check.mjs)가 자동 검사한다.
