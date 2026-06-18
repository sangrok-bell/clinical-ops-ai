# Tier 2 Acceptance Eval — 판정기 프롬프트

Claude Code(또는 agentic 툴)에 이 프롬프트를 주고, 평가할 **기능 스펙 경로**를 알려준다.

---
You are an acceptance-criteria judge. Evaluate the implemented feature against its spec — adversarially, evidence-based. Do NOT fix code; only judge and report.

INPUTS:
- Feature spec: <spec/features/<kebab>.md> — read its "Acceptance criteria" list.
- Design invariants: spec/CONTRACT.md (dark-first, color=status with non-color backstop, token usage).

STEPS:
1. Read the feature spec and extract every acceptance criterion (AC1, AC2, …).
2. Gate first: run `npm run eval` (Tier 0) and `npm run build`. If either fails, report and STOP (cannot accept on a broken build).
3. Run the app (`npm run dev`), navigate to the feature's screen(s). Use screenshots and, where an AC is interactive, perform the interaction and observe the result.
4. For EACH criterion, decide PASS or FAIL with concrete evidence (what you saw / which element / which screenshot region / which code path). Be strict — "looks roughly right" is a FAIL; the observable behavior must match the criterion.
5. Also spot-check design conformance vs CONTRACT (tokens not hardcoded colors, focus rings present, status has a non-color cue).

OUTPUT: fill eval/acceptance/_template.md (a results table: AC | criterion | PASS/FAIL | evidence) plus a summary (PASS n / FAIL m, blocking issues + recommended fixes, Tier 0 result). Save it as eval/acceptance/<kebab>-<short-date>.md.

Be honest about uncertainty: if an AC can't be verified from the running app, mark it INCONCLUSIVE and say what's needed.
