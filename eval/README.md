# eval — Aurora 평가 하니스

[`spec/PROCESS.md`](../spec/PROCESS.md)의 Grounded Spec Loop를 게이트한다. 기능을 얹을 때마다 돌린다.

## Tier 0 + Tier 1 — 자동 게이트 (한 커맨드)
```bash
npm run eval        # = node eval/check.mjs && vitest run
```

### Tier 0 — 정적/구조 (`eval/check.mjs`)
1. **tsc 타입체크** — 컴파일 에러 0.
2. **스펙 링크 폐합** — `spec/**/*.md`의 모든 `(.md)` 링크가 실제 파일로 해석됨(코드 스팬 예시 제외).
3. **스펙 ⇄ 소스 일치** — 각 컴포넌트 스펙이 가리키는 소스 파일이 존재하고 명시된 export를 실제로 가짐.
4. **토큰 canon ⇄ `src/index.css`** — CONTRACT의 토큰이 `@theme`에 실제 정의됨(+ 커스텀 유틸 클래스 존재).

### Tier 1 — 행동 테스트 (Vitest + React Testing Library)
- `src/**/*.test.tsx` 단위/상호작용 테스트. role/text/aria/동작 위주(클래스 문자열보다 동작 우선).
- 단독 실행: `npm test`(watch, TDD용) / `npm run test:run`(1회).
- 현재 프리미티브 6종(Button·CountPill/Dot·Card·Avatar/Thumbnail·Toast·Nav 계열) 커버.

거짓음성 없음·빠름 → CI/pre-commit/매 변경에 적합. 비-0 종료코드로 실패를 알림.
실패 시 [PROCESS.md] 5단계(Reconcile): 코드 또는 스펙/테스트를 고쳐 일치시키고 재실행.

> 컴포넌트를 추가/이름변경하면 `eval/check.mjs`의 `MANIFEST`에 한 줄 추가(스펙↔소스 매핑)하고,
> 스펙의 `Behavior (testable)` 케이스를 `*.test.tsx`로 인코딩한다. 토큰 추가 시 `EXPECTED`/`CUSTOM`에 반영.

## Tier 2 — 인수기준 평가 (LLM-judge)
기능 스펙([`spec/_templates/feature.md`](../spec/_templates/feature.md))의 acceptance criteria를 실제 동작과 대조.
Claude Code에서:
```
eval/acceptance/PROMPT.md 를 따라 <기능 스펙 경로>의 acceptance criteria를 평가해줘
```
판정기는 앱을 빌드·실행하고 스크린샷/상호작용으로 기준별 PASS/FAIL을 evidence와 함께 보고한다.
판정표 양식은 [`eval/acceptance/_template.md`](./acceptance/_template.md).

## 3-tier 요약
| Tier | 무엇 | 어떻게 | 성격 |
|---|---|---|---|
| 0 | 정적/구조 | `eval/check.mjs` | 결정론, 매번 |
| 1 | 컴포넌트 동작 | Vitest + RTL (`*.test.tsx`) | 결정론, 매번 |
| 2 | 기능 인수기준 | LLM-judge (`acceptance/PROMPT.md`) | 판단형, 기능 단위 |

> 시각 회귀(스크린샷 diff/디자인-언어 judge)는 아직 미포함. 필요해지면 dev 스크린샷 + judge로 같은 하니스에 추가 가능.
