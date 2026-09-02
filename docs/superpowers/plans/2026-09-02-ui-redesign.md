# UI 리디자인 ("모던 미니멀 + 밸런스") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로토타입 톤이었던 QR-Place UI를, 사용자가 브라우저 목업으로 직접 고른 "모던 미니멀 + 밸런스" 디자인 시스템으로 앱 9개 화면 전체에 적용한다.

**Architecture:** 대부분의 변화는 `app/globals.css`의 디자인 토큰(`:root`)과 공유 클래스(`.app-header`, `.btn`, `.menu-row`, `.chart-box`, `.kpi`, `.qr-card`, `.line`, `.summary`, `.pay-method`)에 집중된다. 이 토큰/클래스를 쓰는 7개 화면은 CSS만 바꾸면 자동으로 반영되고, 인라인 스타일로 따로 만들어진 2개 화면(메뉴관리, 신규매장등록)만 TSX를 고쳐 기존 공유 클래스를 쓰도록 리팩터링한다.

**Tech Stack:** Next.js 15 App Router, 순수 CSS(커스텀 프로퍼티), `next/font/google` (Noto Sans KR)

**Spec:** [docs/superpowers/specs/2026-09-02-ui-redesign-design.md](../specs/2026-09-02-ui-redesign-design.md)

## Global Constraints

- `--radius`는 `14px`로 **변경하지 않는다** (스펙: 밸런스 목업이 기존 14px과 일치).
- 새 인터랙션은 카드 hover(`translateY(-2px)` + 그림자, 180ms)와 버튼 active(`scale(.97)`, 120ms)뿐 — 그 이상의 애니메이션 추가 금지 (스펙: YAGNI).
- 순수 표시용 카드(`.kpi`, `.summary`)에는 hover 효과를 넣지 않는다 — 그림자만 적용 (스펙: 인터랙션 섹션).
- 폰트는 Pretendard가 아니라 **Noto Sans KR**을 쓴다 (스펙: 라이선스/CDN 이슈 회피).
- 레이아웃 구조, 다크모드, 페이지 전환 애니메이션, 아이콘 세트 교체는 범위 밖 (스펙: Out of scope).
- 이 플랜은 시각적 변경 전용이라 새 유닛 테스트는 없다. 기존 `npx vitest run` + `npx tsc --noEmit`이 계속 통과해야 하고, 검증은 브라우저 렌더링/스크린샷으로 한다 (스펙: 테스트/검증 방법).

---

### Task 1: 디자인 토큰 + 헤더 + 카드 + 버튼 (`app/globals.css`)

**Files:**
- Modify: `app/globals.css:1-14` (`:root` 토큰)
- Modify: `app/globals.css:47-78` (`.app-header` 관련)
- Modify: `app/globals.css:140-150` (`.menu-row`)
- Modify: `app/globals.css:248-273` (`.btn` 관련)
- Modify: `app/globals.css:306-312` (`.summary`)
- Modify: `app/globals.css:334-348` (`.pay-method`)
- Modify: `app/globals.css:373-390` 근처는 건드리지 않음(카드폼은 톤 유지)
- Modify: `app/globals.css:453-458` (`.kpi`)
- Modify: `app/globals.css:468-474` (`.chart-box`)
- Modify: `app/globals.css` `.qr-card` 블록 (QR 생성 기능에서 추가된 부분)
- Modify: `app/globals.css` `.line` 블록 (카트/체크아웃 라인)

**Interfaces:**
- Consumes: 없음 (순수 CSS, 다른 태스크에 의존하지 않음)
- Produces: 새 CSS 커스텀 프로퍼티 `--header-bg: #111827`. Task 2가 여기에 `--font-noto-sans-kr` 변수를 추가로 참조하게 된다.

- [ ] **Step 1: `:root` 토큰 교체**

`app/globals.css` 맨 위 `:root { ... }` 블록을 통째로 아래로 바꾼다.

Before:
```css
:root {
  --bg: #f4f5f7;
  --surface: #ffffff;
  --line: #e5e7eb;
  --text: #18181b;
  --muted: #71717a;
  --brand: #ea580c;
  --brand-dark: #c2410c;
  --brand-soft: #fff1e7;
  --ok: #16a34a;
  --warn: #b45309;
  --radius: 14px;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06);
}
```

After:
```css
:root {
  --bg: #f9fafb;
  --surface: #ffffff;
  --line: #e5e7eb;
  --text: #111827;
  --muted: #9ca3af;
  --brand: #f97316;
  --brand-dark: #c2410c;
  --brand-soft: #fff1e7;
  --ok: #16a34a;
  --warn: #b45309;
  --radius: 14px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  --header-bg: #111827;
}
```

- [ ] **Step 2: 헤더를 다크로 교체**

Before:
```css
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-header .back {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  color: var(--text);
  line-height: 1;
}

.app-header h1 {
  font-size: 1.05rem;
  margin: 0;
  flex: 1;
}

.app-header .sub {
  font-size: 0.78rem;
  color: var(--muted);
}
```

After:
```css
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-bg);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-header .back {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  color: #fff;
  line-height: 1;
}

.app-header h1 {
  font-size: 1.05rem;
  margin: 0;
  flex: 1;
  color: #fff;
}

.app-header .sub {
  font-size: 0.78rem;
  color: var(--brand);
  font-weight: 600;
}
```

- [ ] **Step 3: 클릭 가능한 카드에 그림자 + hover 추가 (`.menu-row`)**

Before:
```css
.menu-row {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  box-shadow: var(--shadow);
}
```

After:
```css
.menu-row {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.menu-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}
```

- [ ] **Step 4: 버튼에 active/hover 인터랙션 추가**

Before:
```css
.btn {
  display: block;
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 15px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  background: var(--brand);
  color: #fff;
}
.btn:disabled {
  background: #d4d4d8;
  cursor: not-allowed;
}
```

After:
```css
.btn {
  display: block;
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 15px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  background: var(--brand);
  color: #fff;
  transition: transform 0.12s ease, filter 0.12s ease;
}
.btn:disabled {
  background: #d4d4d8;
  cursor: not-allowed;
}
.btn:active:not(:disabled) {
  transform: scale(0.97);
}
@media (hover: hover) {
  .btn:hover:not(:disabled) {
    filter: brightness(1.08);
  }
}
```

- [ ] **Step 5: 순수 표시용 카드에 그림자만 추가 (`.summary`, `.kpi`, `.chart-box`)**

`.summary` before:
```css
.summary {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  margin: 0 16px;
}
```
`.summary` after (한 줄 추가):
```css
.summary {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  margin: 0 16px;
  box-shadow: var(--shadow);
}
```

`.kpi` before:
```css
.kpi {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
}
```
`.kpi` after:
```css
.kpi {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  box-shadow: var(--shadow);
}
```

`.chart-box` before:
```css
.chart-box {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  margin: 12px 16px;
}
```
`.chart-box` after:
```css
.chart-box {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  margin: 12px 16px;
  box-shadow: var(--shadow);
}
```

- [ ] **Step 6: 클릭 가능한 카드에 그림자 + hover 추가 (`.qr-card`, `.pay-method`), 순수 표시용 카드엔 그림자만 (`.line`)**

`.qr-card` before:
```css
.qr-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px;
  text-align: center;
}
```
`.qr-card` after:
```css
.qr-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px;
  text-align: center;
  box-shadow: var(--shadow);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.qr-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}
```

`.pay-method` before:
```css
.pay-method {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1.5px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  background: var(--surface);
  cursor: pointer;
  font-weight: 600;
}
```
`.pay-method` after:
```css
.pay-method {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1.5px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  background: var(--surface);
  cursor: pointer;
  font-weight: 600;
  box-shadow: var(--shadow);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.pay-method:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}
```
(바로 아래 있는 `.pay-method.active`, `.pay-method .radio`, `.pay-method.active .radio` 블록은 그대로 둔다.)

`.line` before:
```css
.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  margin-bottom: 10px;
}
```
`.line` after (그림자만 추가, hover는 넣지 않는다 — 순수 표시용 카드이기 때문):
```css
.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: var(--shadow);
}
```

- [ ] **Step 7: 브라우저로 확인**

`npm run dev`로 서버를 띄우고 (또는 이미 떠 있으면 그대로) 아래 URL을 렌더링해서 확인한다:
- `http://localhost:3000/` — 헤더가 다크 네이비인지
- `http://localhost:3000/stores/1?table=A1` — 메뉴 카드에 마우스 올렸을 때 살짝 떠오르는지
- `http://localhost:3000/dashboard/1` — KPI/차트 카드에 그림자가 은은하게 보이는지 (hover는 없어야 함)

콘솔에 CSS 관련 에러/경고가 없는지 `read_console_messages`로 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add app/globals.css
git commit -m "style: 모던 미니멀 디자인 토큰 + 헤더/카드/버튼 인터랙션 적용"
```

---

### Task 2: Noto Sans KR 웹폰트 적용

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css` (`html, body { font-family: ... }` 블록, 대략 20-30번 줄)

**Interfaces:**
- Consumes: 없음
- Produces: CSS 변수 `--font-noto-sans-kr` (globals.css의 `font-family`에서 사용)

- [ ] **Step 1: `next/font/google`로 Noto Sans KR 로드**

`app/layout.tsx` 전체를 아래로 바꾼다.

Before:
```tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR-Place",
  description: "QR 스캔 메뉴 조회 · 주문 · 개인화 추천",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}
```

After:
```tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "QR-Place",
  description: "QR 스캔 메뉴 조회 · 주문 · 개인화 추천",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: `globals.css`의 `font-family`가 그 변수를 쓰도록 교체**

Before:
```css
html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
}
```

After:
```css
html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-noto-sans-kr), -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, "Apple SD Gothic Neo", sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (Next.js가 `next/font/google`의 `Noto_Sans_KR` export 타입을 이미 제공하므로 별도 설치 불필요)

- [ ] **Step 4: 브라우저로 확인**

`http://localhost:3000/` 접속 후 `javascript_tool`로 확인:
```js
getComputedStyle(document.body).fontFamily
```
Expected: 결과 문자열에 `"Noto Sans KR"`이 포함됨 (Next.js가 `--font-noto-sans-kr` 변수에 실제 폰트 패밀리명을 주입한다)

- [ ] **Step 5: 커밋**

```bash
git add app/layout.tsx app/globals.css
git commit -m "style: Noto Sans KR 웹폰트 적용"
```

---

### Task 3: 메뉴관리 페이지 리스트를 공유 카드 클래스로 교체

**Files:**
- Modify: `app/dashboard/[storeId]/menus/page.tsx`

**Interfaces:**
- Consumes: Task 1에서 만든 `.menu-row`(그림자+hover), `.menu-list`(기존에 이미 있던 클래스, 변경 없음) — `app/globals.css`
- Produces: 없음 (터미널 페이지, 다른 태스크가 이 파일을 참조하지 않음)

- [ ] **Step 1: 인라인 스타일 `<ul className="plain">` 블록을 `.menu-list`/`.menu-row`로 교체**

`app/dashboard/[storeId]/menus/page.tsx`에서 아래 블록을 찾는다 (return문 안, "메뉴 추가" 버튼 아래).

Before:
```tsx
      <div className="section" style={{ paddingTop: 0 }}>
        {menus.length === 0 ? (
          <p className="empty">등록된 메뉴가 없습니다.</p>
        ) : (
          <ul className="plain">
            {menus.map((m) => (
              <li
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div className="muted">
                    {won(m.price)} · {m.tags.category ?? "-"} · 맵기{" "}
                    {m.tags.spicy ?? 0}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="btn ghost" onClick={() => openEdit(m)}>
                    수정
                  </button>
                  <button className="btn ghost" onClick={() => remove(m)}>
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
```

After:
```tsx
      {menus.length === 0 ? (
        <p className="empty">등록된 메뉴가 없습니다.</p>
      ) : (
        <div className="menu-list">
          {menus.map((m) => (
            <div key={m.id} className="menu-row" style={{ cursor: "default" }}>
              <div>
                <div className="name">{m.name}</div>
                <div className="meta">
                  {won(m.price)} · {m.tags.category ?? "-"} · 맵기{" "}
                  {m.tags.spicy ?? 0}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button className="btn ghost" onClick={() => openEdit(m)}>
                  수정
                </button>
                <button className="btn ghost" onClick={() => remove(m)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 브라우저로 확인**

`http://localhost:3000/dashboard/1/menus` 접속:
- 메뉴 목록이 그림자 있는 카드로 보이는지
- 항목에 마우스 올렸을 때 살짝 떠오르는지 (버튼 클릭 동작에는 영향 없어야 함)
- "메뉴 추가" → 폼 시트 열기 → 저장 → 목록에 반영되는 기존 흐름이 깨지지 않았는지 (라면 같은 이름으로 하나 추가해보고 삭제까지 확인)

콘솔 에러 없는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add "app/dashboard/[storeId]/menus/page.tsx"
git commit -m "style: 메뉴관리 목록을 공유 카드 클래스(.menu-row)로 교체"
```

---

### Task 4: 신규매장등록 페이지 검색결과 리스트를 공유 카드 클래스로 교체

**Files:**
- Modify: `app/dashboard/new/page.tsx`

**Interfaces:**
- Consumes: `.pay-methods`/`.pay-method`/`.pay-method.active`/`.pay-method .radio` (Task 1에서 그림자+hover 추가된 버전) — `app/globals.css`
- Produces: 없음

- [ ] **Step 1: 인라인 스타일 `<ul className="plain">` 검색결과 블록을 `.pay-methods`/`.pay-method`로 교체**

`app/dashboard/new/page.tsx`에서 검색 결과를 렌더링하는 블록을 찾는다.

Before:
```tsx
      {places && (
        <div className="section" style={{ paddingTop: 0 }}>
          {places.length === 0 ? (
            <p className="empty">검색 결과가 없습니다.</p>
          ) : (
            <ul className="plain">
              {places.map((p) => (
                <li
                  key={p.placeId}
                  onClick={() => setSelected(p)}
                  style={{
                    cursor: "pointer",
                    borderRadius: 10,
                    padding: 10,
                    background:
                      selected?.placeId === p.placeId
                        ? "var(--brand-soft)"
                        : "transparent",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="muted">{p.address}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
```

After:
```tsx
      {places && (
        <>
          {places.length === 0 ? (
            <p className="empty">검색 결과가 없습니다.</p>
          ) : (
            <div className="pay-methods">
              {places.map((p) => (
                <div
                  key={p.placeId}
                  className={`pay-method${
                    selected?.placeId === p.placeId ? " active" : ""
                  }`}
                  onClick={() => setSelected(p)}
                >
                  <span className="radio" />
                  <div>
                    <div>{p.name}</div>
                    <div
                      className="muted"
                      style={{ fontWeight: 400, marginTop: 2 }}
                    >
                      {p.address}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
```

(이 마크업은 `app/stores/[storeId]/checkout/page.tsx`의 결제수단 선택 UI와 동일한 패턴이다 — 라디오 점 + 굵은 제목 + 보조 텍스트.)

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 브라우저로 확인 (실제 카카오 API 사용)**

`http://localhost:3000/dashboard/new` 접속:
- "김가네 한식당" 등으로 검색 → 결과가 라디오 카드 스타일로 나오는지
- 하나 클릭 → 선택된 카드에 브랜드 컬러 테두리+배경, 라디오 점이 채워지는지 (`.pay-method.active`)
- "이 매장으로 등록" 클릭 → 정상적으로 새 매장 생성되고 `/dashboard/{id}/menus`로 이동하는지 (기존 흐름 회귀 없는지)

콘솔 에러 없는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add app/dashboard/new/page.tsx
git commit -m "style: 신규매장등록 검색결과를 공유 카드 클래스(.pay-method)로 교체"
```

---

### Task 5: 전체 9개 화면 최종 회귀 검증

**Files:**
- 없음 (코드 변경 없이 검증만)

**Interfaces:**
- Consumes: Task 1-4에서 완성된 모든 화면
- Produces: 없음 (플랜의 마지막 태스크)

- [ ] **Step 1: 자동 테스트 전체 실행**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 기존 13개 테스트 전부 PASS, 타입 에러 없음 (이 플랜은 로직을 건드리지 않았으므로 전부 그대로 통과해야 한다)

- [ ] **Step 2: 9개 화면 전체 스크린샷 확인**

아래 9개 URL을 브라우저 도구로 순서대로 열어서 스크린샷을 찍고, 다크 헤더/카드 그림자/여백이 일관되게 적용됐는지 확인한다 (店 id=1 시드 데이터 기준):

1. `http://localhost:3000/`
2. `http://localhost:3000/stores/1?table=A1`
3. `http://localhost:3000/stores/1/cart?table=A1` (장바구니에 메뉴 1개 이상 담은 뒤 접근)
4. `http://localhost:3000/stores/1/checkout?table=A1`
5. 체크아웃에서 실제로 결제 완료까지 진행해 주문완료/상세 화면 확인
6. `http://localhost:3000/dashboard/1`
7. `http://localhost:3000/dashboard/1/menus`
8. `http://localhost:3000/dashboard/1/qr`
9. `http://localhost:3000/dashboard/new`

각 화면에서 `read_console_messages`로 콘솔 에러가 없는지도 같이 확인한다.

- [ ] **Step 3: 문제 발견 시 수정**

스크린샷에서 깨진 레이아웃(예: 다크 헤더 위 흰 글씨가 안 보이거나, 그림자가 과하거나)을 발견하면 해당 Task로 돌아가 `app/globals.css`를 조정하고 다시 확인한다. 이 스텝은 발견된 문제가 없으면 건너뛴다.

- [ ] **Step 4: 최종 커밋 (조정 사항이 있었던 경우만)**

```bash
git add -A
git commit -m "style: 리디자인 최종 조정"
```
