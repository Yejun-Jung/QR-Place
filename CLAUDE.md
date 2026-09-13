# QR-Place — Claude Code 핸드오프 문서

## 프로젝트 개요

**프로젝트명:** QR-Place  
**목적:** 캡스톤디자인 개인 프로젝트 (7주 완성)  
**개발자:** 1인 개발 (조기취업 병행, 주말/퇴근 후 작업)  
**한 줄 소개:** QR코드 스캔만으로 메뉴 확인부터 통계 분석까지 제공하는 스마트 마케팅 플랫폼

---

## 기획 확정 내용

### 타겟 사용자
- **점주(B2B):** 디지털 전환이 필요한 소규모 식당 사장님
- **고객(B2C):** 해당 식당을 방문하는 일반 손님

### 기획 배경
- **문제 인식:** 최근 테이블 오더(태블릿) 도입이 늘고 있으나 초기 하드웨어 설치 비용이 비싸, 영세 식당들은 여전히 아날로그 방식에 머무르며 디지털 전환(DX)의 사각지대에 놓여있음.
- **해결 방안:** 별도의 기기 설치 없이 고객의 스마트폰으로 구동되는 QR 시스템을 통해 점주의 비용 부담을 줄이고, 수집된 통계 데이터를 바탕으로 고객에게 '내 입맛 맞춤형 메뉴'를 추천해 주는 초개인화 디지털 전환 솔루션을 구축.

### 핵심 차별점
기존 QR 주문 시스템은 단순 메뉴 나열·결제용 1회성 도구이지만,  
QR-Place는 유저의 과거 주문/방문 통계를 분석해 취향에 맞는 메뉴를 자동 추천하는 초개인화 기능이 핵심 차별점.  
(AI/딥러닝 없이 view_logs DB의 태그 가중치 집계 SQL로 구현 — 1인 개발 현실 반영)

구체적으로는 아래 4가지를 하나의 흐름으로 묶었다.

1. **초개인화 추천** — view_logs의 태그 가중치로 메뉴판 정렬 자체가 유저마다 다르다 (lib/recommend.ts)
2. **나의 취향 리포트** — 그 추천 근거를 손님에게 직접 보여준다. 관심 카테고리 그래프 + 한 줄 요약 (app/stores/taste/)
3. **메뉴 페어링 추천** — 결제완료 주문을 자기조인해 "함께 많이 시킨 메뉴"를 제안 (구매 데이터 기반 연관 추천)
4. **룰렛 이벤트** — 당첨 시 실제 0원 무료증정이 주문·결제까지 반영되는 게이미피케이션 (서버 추첨)

보조 차별점: 카카오맵 "내 맛집 지도", 점주 통계 대시보드(음료·주류는 인기순 집계에서 제외), 하드웨어 설치 비용 0원.

---

## 확정된 기술 스택

| 영역 | 기술 |
|---|---|
| Front-end & Back-end | Next.js 15 (App Router, TypeScript) |
| Database | SQLite (개발) -> Vercel Postgres (배포) |
| 배포 | Vercel (플랜B: iwinv VPS) |
| 외부 API | 카카오 로컬 API (장소 검색), 카카오맵 API |
| 통계 차트 | Chart.js + react-chartjs-2 |
| 테스트 | Vitest |

---

## DB 스키마 (확정)

- users: id, kakao_id(UNIQUE), nickname
- stores: id, kakao_place_id, name, latitude, longitude, owner_user_id(점주 = 이 매장 소유자)
- menus: id, store_id, name, price, description, tags(JSONB)
  - tags 예시: {"category": "찌개", "spicy": 3, "price_range": "mid"}
- view_logs: id, user_id(NULL=비로그인), table_number, store_id, menu_id, action_type(view|order), created_at
- orders: id, store_id, user_id, table_number, status(pending|paid|cancelled), payment_method, total_amount, created_at, paid_at
- order_items: id, order_id, menu_id, name, price, quantity
  - 이름·가격은 **주문 시점 스냅샷** (클라이언트 위조 방지: 서버가 DB 기준으로 다시 계산)
- roulette_spins: id, user_id, store_id, prize_kind, prize_menu_id, redeemed_at, spun_at
  - 유저×매장 하루 1회 제한 + **서버가 뽑은 당첨 상품 기록**. 주문 생성 시 0원 항목이
    진짜 당첨분인지 대조하는 근거이며, redeemed_at으로 재사용을 막는다.

### 권한 규칙 (lib/authz.ts)

- **점주 전용 API** (매출 통계·주문 목록·메뉴 CRUD): 로그인 + `stores.owner_user_id` 일치해야 통과.
  메뉴 단건 수정·삭제는 그 메뉴가 해당 매장 것인지까지 확인한다.
- **손님용 API** (메뉴 조회·페어링·매장 정보): 공개.
- **주문 결제/취소**: 테이블 번호 또는 본인 세션이 일치해야 통과 (주문번호만으로는 불가).

---

## 추천 알고리즘 (lib/recommend.ts)

1. view_logs에서 유저의 최근 30일 로그 조회
2. 태그 토큰별 가중치 합산 (order=2점, view=1점)
3. 상위 3개 태그 추출
4. 현재 식당 메뉴 중 상위 태그 겹치면 recommendScore 부여
5. recommendScore 내림차순 정렬 → 메뉴판 최상단 맞춤 추천 배너 표시
6. 로그 없는 신규/비로그인 유저 → 자동으로 인기순 (콜드 스타트)

---

## 로그인 전략

- 비로그인 주문: 로그인 없이 메뉴 조회·주문 100% 가능 (입구 장벽 제로)
  - view_logs/orders에 user_id=NULL로 저장하고, 대신 **테이블 번호**로 묶는다.
  - 단, 익명 세션 ID는 구현하지 않았다 → 비로그인 손님은 재방문해도 개인화가 붙지 않고
    인기순(콜드 스타트)으로 나온다. 개인화를 받으려면 카카오 로그인이 필요하다.
- 카카오 로그인 유도 시점: "내 지도에 저장", "룰렛 이벤트" 혜택 버튼 클릭 시
  - 구현: NextAuth.js + 카카오 OAuth Provider 완료

---

## 카카오 API 연동 계획

### 카카오 로컬 API
- 사용 위치: 점주 식당 등록 시 가게 이름 검색
- 역할: 진짜 위도/경도와 카카오 장소 ID를 stores 테이블에 저장

### 카카오맵 API
- 사용 위치: 고객의 "내 맛집 지도" 탭 (`app/stores/map/`)
- 역할: 지도 띄우기 + stores DB의 좌표로 방문 식당 핀 표시
- 라이브러리: react-kakao-maps-sdk (설치·연동 완료, `NEXT_PUBLIC_KAKAO_MAP_KEY` 필요)

---

## 현재 구현 현황

### 이미 있는 것
- Next.js 15 + TypeScript 세팅 완료
- DB 스키마(schema.sql) + 더미 시드(seed.sql) 완성
- API 라우트 전체 (/api/stores, /api/orders, /api/logs 등)
- 추천 알고리즘 순수 함수 (lib/recommend.ts)
- 장바구니 훅 (lib/useCart.ts)
- SQLite 기본 실행 (npm run dev만으로 DB 없이 작동)
- 점주용 식당 등록 화면 — 카카오 로컬 API 장소 검색 + 메뉴 CRUD (dashboard/new/, dashboard/[storeId]/menus/)
- QR 코드 생성 기능 — 테이블별 동적 QR 생성 + 이미지 다운로드 (dashboard/[storeId]/qr/)
- 카카오 로그인 — NextAuth.js + 카카오 OAuth (auth.ts), 손님 개인화·점주 매장 소유권 연결
- 카카오맵 연동 — react-kakao-maps-sdk + 내 맛집 지도 페이지 (app/stores/map/, NEXT_PUBLIC_KAKAO_MAP_KEY 필요)
- 점주 대시보드 — 매출·방문자·인기메뉴 통계 차트(Chart.js) 포함 (dashboard/[storeId]/page.tsx)
- UI 디자인 리뉴얼 — 손님/점주 화면 전체 색감·레이아웃·인터랙션 정리
- 룰렛 이벤트 — 슬롯머신 모달 (상품 4종 가중치, 로그인 필수, 매장별 하루 1회).
  **당첨 추첨은 서버**가 하고 당첨 메뉴는 0원으로 주문·결제까지 반영된다.
- 주문·결제 — 장바구니 → 주문 생성 → 모의 결제(카드/카카오페이/현장) → 주문 완료.
  결제 페이지에서 뒤로가기 시 확인 후 pending 주문을 완전 삭제.
- 나의 취향 리포트 (app/stores/taste/) — 유저 전체 로그를 태그 가중치로 집계, 관심
  카테고리 막대그래프 + 한 줄 요약
- 메뉴 페어링 추천 — 결제완료 주문 order_items 자기조인으로 "함께 많이 시킨 메뉴" top3
- 원페이지 메뉴판 — 카테고리별 섹션 + 칩 클릭 시 해당 섹션으로 스무스 스크롤
- 권한 가드 (lib/authz.ts) — 점주 API 소유자 확인, 무료증정 위조 차단, 주문 소유권 확인
- **Vercel 배포 완료** — Neon Postgres 연결, 카카오 로그인/지도 키 등록
  → https://qr-place.vercel.app

### 아직 없는 것 (남은 과제)
1. ~~ESLint 설정~~ (완료 — eslint.config.mjs, flat config)
2. API 라우트 통합 테스트 — 주문 라우트만 커버됨 (전체 45개 테스트). 나머지 라우트와 useCart 훅은 미테스트
3. 조리 상태 알림 (orders.status가 pending/paid/cancelled뿐 — 조리중/준비완료 없음)
4. 비로그인 손님용 익명 세션 ID (현재는 로그인해야 개인화가 붙음)

---

## 개발 일정 (7주)

| 주차 | 목표 |
|------|------|
| 1주차 | (완료) 기획 확정, 와이어프레임, DB 스키마 설계 |
| 2주차 | (완료) Next.js + Vercel 초기 세팅, DB 테이블 생성 |
| 3주차 | (완료) 점주용 화면 구현 (식당/메뉴 등록, QR 생성) |
| 4주차 | (완료) 고객용 모바일 화면 구현 (메뉴판·추천 배너·룰렛) |
| 5주차 | (완료) 카카오맵 연동 + 맛집 지도 핀 표시 |
| 6주차 | (완료) 통계 차트(Chart.js) + 카카오 로그인 연동 |
| 7주차 | (완료) Vercel 배포, 최종 테스트·버그 수정·코드 제출 |

배포 후 추가 작업: 취향 리포트·메뉴 페어링 추천(차별점 보강), 권한/보안 보완.

---

## 로컬 실행 방법

npm install
npm run dev

고객 메뉴판 (비로그인): http://localhost:3000/stores/1?table=A1
고객 메뉴판 (개인화):   http://localhost:3000/stores/1?table=A1&userId=1
내 맛집 지도 (로그인 필요): http://localhost:3000/stores/map
점주 로그인 → 대시보드:  http://localhost:3000/dashboard
점주 대시보드:           http://localhost:3000/dashboard  (로그인 → 매장 등록 후 소유자만 접근)

DB 초기화: npm run db:reset

---

## Vercel Postgres 전환 (배포 시)

npx vercel link
npx vercel env pull .env.local
npm run db:setup:pg
npm run dev

---

## 참고 사항

- @vercel/postgres는 deprecated이나 캡스톤 범위에서 사용 가능
- 정식 전환 시: @neondatabase/serverless 로 교체 + lib/db.postgres.ts import만 수정
- Node.js 버전 22.5 이상 필요 (SQLite 내장 모듈)
