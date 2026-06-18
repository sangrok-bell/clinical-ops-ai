<!-- Tier 2 판정 결과 양식. 판정기가 기능 스펙의 각 AC에 대해 채운다. -->

# Acceptance 평가 결과 — <기능 이름>
- 대상 스펙: [spec/features/<kebab>.md](../../spec/features/<kebab>.md)
- 커밋/브랜치: <hash>
- 실행: `npm run build` <pass/fail> · dev <port>

| AC | 기준 | 판정 | Evidence (스크린샷/동작/코드 위치) |
|---|---|---|---|
| AC1 | <기준 요약> | ✅/❌ | <무엇을 보고 그렇게 판정했는지> |
| AC2 | ... | ... | ... |

## 종합
- PASS n / FAIL m
- 차단 이슈: <있으면 나열 + 권고 수정>
- Tier 0(`npm run eval`): <PASS/FAIL>
