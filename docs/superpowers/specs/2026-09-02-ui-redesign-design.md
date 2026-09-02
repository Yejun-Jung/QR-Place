# UI 리디자인 — "모던 미니멀 + 밸런스" 디자인 시스템

**날짜:** 2026-09-02
**배경:** 프로토타입 상태의 UI(색감 평범함, 여백 단조로움, 인터랙션 부재, 기본 폰트)를 전체 9개 화면에 걸쳐 다듬는다. superpowers:brainstorming 스킬의 visual-companion으로 3개 톤(웜 비스트로 / 모던 미니멀 / 비비드 푸드테크) 중 **모던 미니멀**을, 3개 여백 밀도(컴팩트 / 밸런스 / 스페이셔스) 중 **밸런스**를 사용자가 직접 브라우저에서 선택했다.

## 범위

앱 내 9개 화면 전체:
홈([app/page.tsx](../../../app/page.tsx)) · 손님 메뉴판([app/stores/[storeId]/page.tsx](../../../app/stores/[storeId]/page.tsx)) · 장바구니([app/stores/[storeId]/cart/page.tsx](../../../app/stores/[storeId]/cart/page.tsx)) · 결제([app/stores/[storeId]/checkout/page.tsx](../../../app/stores/[storeId]/checkout/page.tsx)) · 주문완료/상세([app/stores/[storeId]/orders/[orderId]/page.tsx](../../../app/stores/[storeId]/orders/[orderId]/page.tsx)) · 점주 대시보드([app/dashboard/[storeId]/page.tsx](../../../app/dashboard/[storeId]/page.tsx)) · 메뉴관리([app/dashboard/[storeId]/menus/page.tsx](../../../app/dashboard/[storeId]/menus/page.tsx)) · QR생성([app/dashboard/[storeId]/qr/page.tsx](../../../app/dashboard/[storeId]/qr/page.tsx)) · 신규매장등록([app/dashboard/new/page.tsx](../../../app/dashboard/new/page.tsx))

**방식**: 대부분의 시각 변화는 [app/globals.css](../../../app/globals.css)의 CSS 커스텀 프로퍼티(`:root` 토큰)와 공유 클래스(`.app-header`, `.btn`, `.menu-row`, `.chart-box`, `.kpi`, `.qr-card`, `.sheet`, `.line`, `.summary`, `.pay-method` 등)에 집중돼 있어, 개별 페이지 TSX는 거의 수정하지 않고 CSS 레이어 변경만으로 9개 화면에 일괄 적용된다. 페이지별 인라인 스타일(`style={{...}}`)을 쓴 곳만 예외적으로 손본다.

## 디자인 토큰

`:root`에 정의된 값을 아래처럼 교체한다 (기존 값 → 새 값):

| 토큰 | 기존 | 신규 | 비고 |
|---|---|---|---|
| `--bg` | `#f4f5f7` | `#f9fafb` | 톤 유지, 살짝 더 쿨하게 |
| `--surface` | `#ffffff` | `#ffffff` | 유지 |
| `--text` | `#18181b` | `#111827` | |
| `--muted` | `#71717a` | `#9ca3af` | |
| `--line` | `#e5e7eb` | `#e5e7eb` | 유지 |
| `--brand` | `#ea580c` | `#f97316` | 약간 더 비비드 |
| `--brand-dark` | `#c2410c` | `#c2410c` | 유지 (hover/active용) |
| `--brand-soft` | `#fff1e7` | `#fff1e7` | 유지 |
| `--radius` | `14px` | `14px` | **변경 없음** — 밸런스 목업이 14px과 일치 |
| `--shadow` | `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)` | `0 2px 8px rgba(0,0,0,.05)` | 더 은은하고 균일하게, 카드 전반에 일관 적용 |
| (신규) `--header-bg` | 없음 | `#111827` | 헤더 전용 다크 배경 |

> **최종 리뷰 반영 (2026-09-02):** 위 표의 `--muted` 신규값 `#9ca3af`는 흰 배경 대비 2.54:1로 WCAG AA 본문 텍스트 기준(4.5:1)을 통과하지 못해, 실제 배포본에서는 `#6b7280`(대비 4.83:1)으로 조정했다. 같은 이유로 `a { color: var(--brand) }`도 `var(--brand-dark)`로 변경했다 (`--brand`는 흰 배경 링크 텍스트 기준 2.80:1에 불과).

### 헤더 (`.app-header`)

가장 눈에 띄게 바뀌는 부분. 현재는 흰색 sticky 바 + 텍스트뿐. 변경 후:
- `background: var(--header-bg)` (다크 네이비), `color: #fff`
- `.app-header .sub` 색상을 `var(--brand)`로 (다크 배경 위 오렌지 포인트)
- `.app-header .back` 아이콘 색상 흰색으로
- sticky/border 등 레이아웃 속성은 유지

### 카드류 공통 (`.menu-row`, `.chart-box`, `.kpi`, `.qr-card`, `.line`, `.summary`, `.pay-method`)

- `box-shadow: var(--shadow)`를 전부 일관 적용 (`.chart-box`, `.kpi` 등 현재 그림자 없는 곳 포함)
- hover 시 `transform: translateY(-2px)` + 그림자 진하게, `transition: transform .18s ease, box-shadow .18s ease`
  - 단, 클릭 대상이 아닌 순수 표시용 카드(`.kpi`, `.summary`)는 hover 효과 제외 — 상호작용 가능한 요소(`.menu-row`, `.qr-card`, `.pay-method`, 대시보드 링크 버튼)에만 적용

### 버튼 (`.btn`)

- `background: var(--brand)` 신규 값 적용
- `:active` 상태에 `transform: scale(.97)`, `transition: transform .12s ease, filter .12s ease`
- `:hover`(포인터 디바이스에서만, `@media (hover:hover)`) 시 `filter: brightness(1.08)`

### 타이포그래피

- **Noto Sans KR**을 `next/font/google`로 로드해 전역 적용 (Pretendard는 구글 폰트가 아니라 CDN/라이선스 이슈가 있어 목업 단계에서만 사용, 실제 구현은 Noto Sans KR로 대체 — 톤은 동일한 모던 산세리프)
- [app/layout.tsx](../../../app/layout.tsx)에서 로드해 `<body>`에 폰트 클래스 적용
- 기존 `font-family` 폴백 스택은 Noto Sans KR 뒤에 유지 (로드 실패 시 대비)

## 페이지별 체크리스트

| 화면 | 변경 방식 |
|---|---|
| 홈 | 헤더 다크화만 (자동) |
| 손님 메뉴판 | 헤더 다크화, `.menu-row` 그림자+hover (자동) |
| 장바구니 | 헤더 다크화, `.line` 그림자 (자동) |
| 결제 | 헤더 다크화, `.pay-method` 그림자+hover (자동), `.card-form` 톤 유지 |
| 주문완료 | 헤더 없음 유지, `.done .check` 색상 토큰 자동 반영 |
| 대시보드 | 헤더 다크화, `.kpi`/`.chart-box` 그림자 통일 (자동) |
| 메뉴관리 | 헤더 다크화, `.sheet` 폼 톤 유지, 목록 항목에 은은한 카드화(현재 `<ul className="plain">` 기반 인라인 스타일 → `.menu-row`류 클래스로 교체해 그림자/여백 통일) |
| QR생성 | 헤더 다크화, `.qr-card` 그림자+hover (자동) |
| 신규매장등록 | 헤더 다크화, 검색 결과 리스트 항목(현재 인라인 스타일) → 공통 리스트 카드 스타일로 교체 |

메뉴관리·신규매장등록 두 화면만 인라인 스타일을 공유 클래스로 옮기는 실제 TSX 수정이 필요하고, 나머지 7개는 CSS 토큰 변경만으로 자동 반영된다.

## 범위 밖 (Out of scope)

- 레이아웃 구조 변경(그리드 개편, 내비게이션 방식 변경) 없음 — 시각적 톤·간격·인터랙션만
- 다크모드 없음
- 페이지 전환 애니메이션 없음 (Next.js App Router 기본 유지)
- 아이콘 세트 교체 없음 (이모지 그대로 유지)

## 테스트 / 검증 방법

시각적 변경이라 유닛 테스트 대상은 없음. 기존 `npx vitest run` + `npx tsc --noEmit`으로 로직 회귀만 확인하고, 9개 화면 전부 브라우저로 직접 렌더링해 스크린샷으로 확인한다 (다크 헤더, 카드 그림자, hover/active 인터랙션 포함).
