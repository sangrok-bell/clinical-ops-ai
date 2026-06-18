# 01 · Design Tokens

> ⚠️ **테마 = Harmonic (라이트).** 토큰 *이름*은 그대로지만 *값*은 회사 시스템으로 교체됨.
> 아래 표의 일부 hex는 이전(Aurora·다크) 값이 남아 있을 수 있다 — **값의 SoT는 항상 [`src/index.css`](../src/index.css) `@theme`.**
> 현재 핵심값: `canvas`#FBFBFC · `surface`#FFFFFF · `elevated`#EEEEF4 · `ink`#1C1C1A · `dim`#6B6B6B · `icon`#9B9BA3 ·
> `brand`#08264A(남색) · `positive`#C8E64A(라임) · `info`#4A6F9C · `danger`#E05252 · `warning`#F59E0B · `caution`#F6FF8F · `magenta`#F4A6B8 ·
> radii 16/12/12/full · 그림자 대신 보더(floating만 soft shadow). (표 전체 재추출은 테마 확정 후 일괄 진행)

> **권위 있는, 닫힌(CLOSED) 토큰 레퍼런스.** 모든 컴포넌트 스펙은 디자인 값을 이 문서에서만 참조한다.
> 여기 없는 색·반경·그림자·그라데이션은 존재하지 않는 것으로 간주한다.
>
> 출처: 검증된 [`src/index.css`](../src/index.css)의 `@theme inline` 블록. 전체 근거 및 2-tier 모델(PRIMITIVES + SEMANTIC)은
> [`design-system/tokens.css`](../design-system/tokens.css)에 있다. 본 문서는 그 중 **Tailwind v4 유틸리티로 노출된 것만** 정리한다.
>
> ⚠️ **모든 hex는 스크린샷 근사치이며 WCAG 대비 수정(AA-lightened / 어둡게 조정)이 반영되어 있다.**
> 출시 전 Figma에서 재추출할 것. 컴포넌트는 절대 raw hex를 쓰지 말고 아래 유틸리티 클래스만 사용한다.

관련 문서: [00-architecture.md](./00-architecture.md) · [02-data-contracts.md](./02-data-contracts.md)

---

## 사용 규칙 (모든 컴포넌트 스펙이 따른다)

- **Dark-first.** 어두운 surface 위에 밝은 텍스트. 색상은 **상태(status)만** 전달하며, 항상 비-색상 backstop(텍스트/아이콘/ring/underline)을 동반한다.
- **채도 높은 fill 위 텍스트는 항상 어둡게.** `text-onaccent`(`#0b1020`) 또는 컴포넌트 내장 fg를 쓰고, 흰색 텍스트는 쓰지 않는다(브랜드 그라데이션 예외는 아래 참고).
- **모든 인터랙티브 요소**는 `focus-visible:ring-2 focus-visible:ring-brand`.
- 토큰을 인용할 때는 코드 포매팅(예: `bg-positive`)하고 "see ../01-tokens.md"를 명기한다.
- 아래 유틸리티 + 일반 Tailwind 레이아웃 유틸리티(`flex` / `gap-*` / `p-*` / `size-*` / `min-w-*`)만 허용된다. 일반 레이아웃 유틸리티는 디자인 토큰이 **아니다**.

---

## 1. Surfaces (배경)

`bg-*` 접두사로 사용. 어두울수록 더 깊은 레이어(canvas → sidebar).

| Utility class | CSS value (hex) | 역할 / 사용처 | 예시 |
| --- | --- | --- | --- |
| `bg-canvas` | `#2b3563` | 앱 최외곽 배경(content 영역 캔버스). 가장 밝은 navy. | `<main className="bg-canvas">` |
| `bg-surface` | `#1a2138` | 카드/패널 기본 surface. [Card](./components/card.md)의 기본 배경. | `<div className="bg-surface rounded-card">` |
| `bg-sidebar` | `#161d33` | 좌측 [Sidebar](./components/sidebar.md) 배경(canvas보다 깊음). | `<aside className="bg-sidebar">` |
| `bg-elevated` | `#20294a` | 한 단계 올라온 surface(활성 nav row, 입력 chip 등). | `<div className="bg-elevated">` |

> 텍스트로 매핑되는 `*-foreground`는 아래 [shadcn aliases](#8-shadcn-aliases) 참조. Aurora surface는 fg를 내장하지 않으므로 명시적 `text-*`와 함께 쓴다.

---

## 2. Text / Icon (전경)

`text-*` 접두사로 사용. 어두운 surface 위 가독성을 위해 AA 보정되어 있다.

| Utility class | CSS value (hex) | 역할 / 사용처 | 예시 |
| --- | --- | --- | --- |
| `text-ink` | `#f5f7ff` | **Primary** 텍스트(제목, 본문, 활성 라벨). | `<h1 className="text-ink">` |
| `text-dim` | `#9aa6cd` | **Secondary** 텍스트(메타, 보조 라벨, 시간). AA-lightened. | `<span className="text-dim">2h ago</span>` |
| `text-icon` | `#97a8db` | 기본 아이콘 색(비활성 lucide 아이콘). AA-lightened. | `<Bell className="text-icon" />` |
| `text-onaccent` | `#0b1020` | 채도 높은 fill 위의 어두운 텍스트/아이콘. 흰색 대신 사용. | `<span className="bg-positive text-onaccent">` |

> 활성 아이콘은 `text-ink`로 승격하는 것이 관례(see [nav.md](./components/nav.md)). `text-icon`은 idle 상태 전용.

---

## 3. Accents (시맨틱 강조색)

`bg-` / `text-` / `ring-` / `border-` 와 조합해 사용. **색상은 상태만 전달**하며 단독으로 의미를 만들지 않는다(backstop 동반 필수).

| Utility token | CSS value (hex) | 역할 / 사용처 | 예시 |
| --- | --- | --- | --- |
| `brand` | `#3fd0c9` | 브랜드 teal. 주요 CTA, **focus ring 기본값**(`ring-brand`). | `focus-visible:ring-2 focus-visible:ring-brand` |
| `positive` | `#3fcf8e` | 성공/긍정 상태. [CountPill](./components/badge.md) `positive` 톤, 성공 토스트. | `<span className="bg-positive text-onaccent">` |
| `info` | `#4c7df0` | 정보/중립 알림. info 토스트, 파란 glow. | `<Toast variant="info" />` |
| `magenta` | `#e85fb0` | 강조/언급, **unread [Dot](./components/badge.md)** 색. PillTone `magenta`. | `<Dot className="bg-magenta" />` |
| `danger` | `#f0556a` | 위험/오류/긴급. PillTone `danger`, urgent ring, TagTone `danger`. | `<span className="bg-danger text-onaccent">` |
| `warning` | `#f08a3c` | 경고(주황). TagTone `warning`. | `<span className="text-warning">` |
| `caution` | `#f0c23c` | 주의(노랑). TagTone `caution`. | `<span className="text-caution">` |

> `PillTone = "positive" | "magenta" | "danger"` 및 `TagTone = "danger" | "warning" | "caution" | "positive"` 매핑은 [02-data-contracts.md](./02-data-contracts.md) 참조.
> `brand` / `info`는 PillTone에는 없고 ring·토스트·CTA에 쓰인다.

---

## 4. Radii (모서리 반경)

`rounded-*` 접두사로 사용. 닫힌 4종.

| Utility class | CSS value | 역할 / 사용처 | 예시 |
| --- | --- | --- | --- |
| `rounded-card` | `20px` | 큰 패널/카드. [Card](./components/card.md), [NotificationPanel](./components/notification-panel.md). | `<div className="rounded-card">` |
| `rounded-toast` | `16px` | 토스트 컨테이너. [Toast](./components/toast.md). | `<div className="rounded-toast">` |
| `rounded-btn` | `14px` | 버튼/썸네일. [Button](./components/button.md), [Thumbnail](./components/media.md). | `<button className="rounded-btn">` |
| `rounded-pill` | `9999px` (`full`) | 알약/원형. [CountPill](./components/badge.md), [Avatar](./components/media.md), [IconButton](./components/nav.md). | `<span className="rounded-pill">` |

> shadcn 반경 별칭(`rounded-lg`/`-md`/`-sm`)은 `--radius`(`0.875rem`) 기반으로 별도 해석된다. Aurora 컴포넌트는 위 4종을 우선 사용한다.

---

## 5. Elevation (그림자 / glow)

`shadow-*` 접두사로 사용. 중립 그림자 2종 + 색상 tint glow 3종.

| Utility class | CSS value | 역할 / 사용처 | 예시 |
| --- | --- | --- | --- |
| `shadow-card` | `0 12px 32px -8px rgba(0,0,0,0.45)` | 카드/패널 기본 입체감. | `<Card className="shadow-card">` |
| `shadow-soft` | `0 4px 12px -2px rgba(0,0,0,0.35)` | 약한 떠 있음(floating 버튼/툴바). | `<button className="shadow-soft">` |
| `shadow-glow-green` | `0 16px 40px -8px rgba(43,190,110,0.45)` | 성공 토스트 glow. [Toast](./components/toast.md) `success`. | `<Toast variant="success" className="shadow-glow-green">` |
| `shadow-glow-blue` | `0 16px 40px -8px rgba(74,120,240,0.45)` | 정보 토스트 glow. [Toast](./components/toast.md) `info`. | `<Toast variant="info" className="shadow-glow-blue">` |
| `shadow-glow-teal` | `0 12px 32px -10px rgba(63,207,142,0.28)` | ghost 토스트 glow(은은한 teal). [Toast](./components/toast.md) `ghost`. | `<Toast variant="ghost" className="shadow-glow-teal">` |

---

## 6. Gradient / Glass (토큰 기반 컴포넌트 유틸리티)

색상 클래스가 아닌 **유틸리티 클래스**다(`index.css`에 직접 정의됨). `bg-*`처럼 쓰되 추가 접두사 없이 클래스명 그대로 사용한다.

| Utility class | CSS value | 역할 / 사용처 | 예시 |
| --- | --- | --- | --- |
| `bg-brand-gradient` | `linear-gradient(90deg, #2f6fe0 0%, #1fa9a2 60%, #1fa86e 100%)` | 주요 브랜드 CTA fill. stop을 어둡게 해 **흰 라벨이 AA를 end-to-end로 통과**(audit fix). 이 fill 위에는 흰색 텍스트 허용. | `<button className="bg-brand-gradient text-white">` |
| `bg-success-gradient` | `linear-gradient(135deg, #2bbe6e 0%, #25a862 100%)` | 성공 토스트 fill. | `<Toast variant="success" className="bg-success-gradient">` |
| `bg-info-gradient` | `linear-gradient(135deg, #5c84f2 0%, #6e8df5 100%)` | 정보 토스트 fill. | `<Toast variant="info" className="bg-info-gradient">` |
| `bg-logo-sphere` | `radial-gradient(circle at 30% 25%, #f08a3c 0%, #e85fb0 50%, #3fd0c9 100%)` | 로고 sphere(주황→마젠타→teal). [Sidebar](./components/sidebar.md) 브랜드 마크. | `<div className="bg-logo-sphere rounded-pill">` |
| `glass` | `background: rgba(255,255,255,0.06); backdrop-filter: blur(20px)` | 반투명 유리 surface(ghost 토스트, floating 요소). | `<div className="glass rounded-toast">` |

> 그라데이션 위 텍스트 규칙: **brand-gradient는 흰색 허용**(stop 어둡게 보정됨), success/info 토스트는 컴포넌트 내장 어두운 fg를 쓴다(see [toast.md](./components/toast.md)).

---

## 7. Motion (모션)

| Utility class | 정의 | 역할 / 사용처 | 예시 |
| --- | --- | --- | --- |
| `animate-toast-in` | `toast-in 0.32s var(--ease-spring) both` (`opacity 0→1`, `translateY 8px→0`) | 토스트 진입 애니메이션. spring easing `cubic-bezier(0.34, 1.56, 0.64, 1)`. | `<Toast className="animate-toast-in">` |

> easing 토큰: `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`. 모션 감소 환경에서는 duration이 축소된다(see [`design-system/tokens.css`](../design-system/tokens.css)의 `prefers-reduced-motion`).

---

## 8. shadcn aliases

`npx shadcn add`로 추가되는 컴포넌트와의 호환을 위한 별칭. `:root`의 시맨틱 var로 해석된다. **Aurora 네이티브 토큰이 우선**이며, 이 별칭들은 외부 shadcn 컴포넌트 호환용으로만 둔다.

| Utility class | resolves to | CSS value (hex) | 역할 / 사용처 |
| --- | --- | --- | --- |
| `bg-background` | `--background` | `#2b3563` | 앱 배경(= `bg-canvas`). |
| `bg-card` | `--card` | `#1a2138` | 카드 surface(= `bg-surface`). |
| `bg-primary` | `--primary` | `#3fd0c9` | primary fill(= brand teal). |
| `bg-secondary` / `bg-muted` | `--secondary` / `--muted` | `#20294a` | 보조 surface(= `bg-elevated`). |
| `bg-accent` | `--accent` | `#3fcf8e` | accent fill(= `positive` green). |
| `bg-destructive` | `--destructive` | `#f0556a` | 파괴적 액션(= `danger`). |
| `bg-popover` | `--popover` | `#1a2138` | 팝오버 surface. |
| `text-foreground` | `--foreground` | `#f5f7ff` | 기본 텍스트(= `text-ink`). |
| `text-muted-foreground` | `--muted-foreground` | `#9aa6cd` | 흐린 텍스트(= `text-dim`). |
| `text-primary-foreground` | `--primary-foreground` | `#0b1020` | primary fill 위 텍스트(= `text-onaccent`). |
| `text-card-foreground` / `text-popover-foreground` | `--card-foreground` / `--popover-foreground` | `#f5f7ff` | 카드/팝오버 텍스트. |
| `text-secondary-foreground` / `text-accent-foreground` / `text-destructive-foreground` | 각 `*-foreground` | `#f5f7ff` / `#0b1020` / `#0b1020` | 각 fill 위 텍스트. |
| `border-border` | `--border` | `rgba(255,255,255,0.08)` | 기본 hairline 보더(전역 `*` 셀렉터 기본값). |
| `border-input` | `--input` | `rgba(255,255,255,0.08)` | 입력 보더. |
| `ring-ring` | `--ring` | `#3fd0c9` | focus ring(= `ring-brand`). |

shadcn 반경 별칭:

| Utility class | CSS value |
| --- | --- |
| `rounded-lg` | `0.875rem` (`--radius`) |
| `rounded-md` | `calc(0.875rem - 2px)` |
| `rounded-sm` | `calc(0.875rem - 4px)` |

---

## 닫힌 토큰 요약 (참조 빠른표)

- **Surfaces:** `bg-canvas` · `bg-surface` · `bg-sidebar` · `bg-elevated`
- **Text:** `text-ink` · `text-dim` · `text-icon` · `text-onaccent`
- **Accents:** `brand` · `positive` · `info` · `magenta` · `danger` · `warning` · `caution`
- **Radii:** `rounded-card` · `rounded-toast` · `rounded-btn` · `rounded-pill`
- **Elevation:** `shadow-card` · `shadow-soft` · `shadow-glow-green` · `shadow-glow-blue` · `shadow-glow-teal`
- **Gradient/Glass:** `bg-brand-gradient` · `bg-success-gradient` · `bg-info-gradient` · `bg-logo-sphere` · `glass`
- **Motion:** `animate-toast-in`
- **shadcn aliases:** `bg-background` · `bg-card` · `bg-primary` · `text-muted-foreground` · `border-border` · `ring-ring` (외 호환 별칭)

이 목록 밖의 디자인 값은 스펙에 등장할 수 없다. 새 값이 필요하면 먼저 [`src/index.css`](../src/index.css)의 `@theme`에 추가하고 본 문서를 갱신한 뒤 참조한다.

> **접두사 규칙:** 색 토큰(surfaces·accents)은 `bg-` 외에 `text-` / `border-` / `ring-` / `ring-offset-` 접두사로도 사용할 수 있다(예: `ring-canvas`, `ring-offset-canvas`, `border-positive`). `@theme`의 색 토큰은 모든 색 계열 유틸리티를 자동 생성하므로 이들도 닫힌 집합에 포함된다.
