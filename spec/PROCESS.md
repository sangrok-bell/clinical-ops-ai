# Grounded Spec Loop — 새 기능을 얹는 프로세스

목적: 제품 방향이 잡히고 기능을 계속 얹을 때, 아키텍처/컴포넌트 명세를 **추측으로 쓰지 않고**,
**실제로 그렇게 생성되도록 정리하고 eval로 게이트**한다. 핵심 불변식:

> **명세 == 검증된 현실.** 명세가 먼저든 코드가 먼저든, 끝에는 둘이 일치한다(drift = 0).

## 루프 (기능 1개당 반복)

```
        ┌─────────────────────────────────────────────────────────┐
        ▼                                                         │
0 CONTRACT(불변)  →  1 Plan  →  2 Spec  →  3 Generate  →  4 Eval ──┤ FAIL
   (canon 등록)      (+인수기준)  (템플릿+테스트) (Claude Code) (Tier0/1/2) │  └→ 5 Reconcile → 재-Eval
                                                              PASS │
                                                                   ▼
                                                        6 Promote / Re-derive
                                                        (검증된 코드에서 명세 재추출, CONTRACT 갱신)
```

**0. CONTRACT (불변)** — 새 토큰/컴포넌트가 필요하면 [CONTRACT.md](./CONTRACT.md)에 먼저 등록.
   토큰은 `src/index.css` `@theme`에도 추가하고 [01-tokens.md](./01-tokens.md) 갱신.

**1. Plan** — 기능을 정의하고 **acceptance criteria**(받아들임 기준)를 먼저 적는다.
   [`_templates/feature.md`](./_templates/feature.md) 사용. 기준이 Tier 2 eval의 채점표가 된다.

**2. Spec (+ 테스트 먼저)** — [`_templates/component.md`](./_templates/component.md)로 새 컴포넌트 명세 작성(CONTRACT 준수).
   스펙의 **`Behavior (testable)`** 섹션 케이스를 **`*.test.tsx`로 먼저 인코딩**한다(red). 테스트 = 가장 정밀한 명세.
   기존 컴포넌트 재사용이면 새 스펙 대신 feature 스펙에서 링크만.

**3. Generate** — Claude Code에 관련 스펙 + [CONTRACT.md](./CONTRACT.md)를 읽히고 구현시킨다.
   (`CLAUDE.md`가 자동 로드되므로 토큰/컨벤션은 이미 인지.)

**4. Eval (게이트)**
   - **Tier 0 — 정적/구조**: tsc 타입체크 · 스펙 링크 폐합 · 스펙↔소스 export 일치 · 토큰 canon↔`index.css` 무결성.
   - **Tier 1 — 행동 테스트(결정론)**: Vitest + React Testing Library 단위/상호작용 테스트(role/text/aria/동작). `*.test.tsx`.
   - Tier 0+1은 **`npm run eval` 한 번**에 게이트된다(거짓음성 없음, **항상 green이어야 통과**).
   - **Tier 2 — 인수기준(LLM-judge)**: 기능에 acceptance criteria가 있으면 실행. Claude Code에게
     [`eval/acceptance/PROMPT.md`](../eval/acceptance/PROMPT.md)를 주면 앱을 띄워 스크린샷·검사하고
     기준별 PASS/FAIL을 evidence와 함께 판정한다.

**5. Reconcile** — eval 실패 시 둘 중 하나로 일치시킨다:
   - 명세가 옳다 → **구현을 고친다**.
   - 현실이 옳다(더 나은 구현) → **명세를 고친다**.
   green까지 4↔5 반복.

**6. Promote / Re-derive** — green이면 **검증된 코드에서 명세를 다시 추출**해 명세==현실을 보장하고,
   필요한 canon 변화를 CONTRACT에 반영한다. (이 레포의 최초 스펙도 이 방식으로 만들어졌다.)

## 왜 이게 "추측"을 막나
- 토큰/컴포넌트/타입 이름이 CONTRACT 한 곳에 고정 → 모든 스펙이 같은 어휘를 쓴다.
- Tier 0가 **스펙↔코드 불일치**(예: 스펙엔 있는데 소스엔 없는 prop/파일)를 기계적으로 잡는다.
- Tier 1(테스트)이 **동작이 명세대로인지**를 결정론적으로 못박는다 — 가장 정밀한 명세 형태.
- Tier 2가 **보이는 결과가 의도(인수기준)에 맞는지** 판정한다.
- 6단계 re-derive가 명세를 항상 현실로 되돌린다.

## 빠른 명령
```bash
npm run eval        # Tier 0 + Tier 1 게이트 (정적 + 행동 테스트, 비-0 종료코드)
npm test            # Tier 1 테스트 watch 모드 (TDD)
npm run build       # tsc + vite 프로덕션 빌드
npm run dev         # 로컬 미리보기
```
Tier 2는 Claude Code에서: "eval/acceptance/PROMPT.md 따라 <기능> 인수기준 평가해줘".
