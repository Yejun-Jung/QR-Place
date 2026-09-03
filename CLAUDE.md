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
- stores: id, kakao_place_id, name, latitude, longitude
- menus: id, store_id, name, price, description, tags(JSONB)
  - tags 예시: {"category": "찌개", "spicy": 3, "price_range": "mid"}
- view_logs: id, user_id(NULL=비로그인), table_number, store_id, menu_id, action_type(view|order), created_at
- orders: id, store_id, user_id, table_number, status, payment_method, total_amount, created_at, paid_at
- order_items: id, order_id, menu_id, name, price, quantity

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
  - localStorage에 익명 세션 ID 발급 → user_id=NULL로 DB 저장
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
- 룰렛 이벤트 UI — 메뉴판 슬롯머신 룰렛 모달 (상품 4종 가중치 랜덤, 로그인 필수, 매장별 하루 1회 제한)

### 아직 없는 것 (구현 필요)
1. Vercel 배포 — Postgres(Neon) 전환 + 환경변수 등록 + 실제 배포

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
| 7주차 | Vercel 배포, 최종 테스트·버그 수정·코드 제출 |

---

## 로컬 실행 방법

npm install
npm run dev

고객 메뉴판 (비로그인): http://localhost:3000/stores/1?table=A1
고객 메뉴판 (개인화):   http://localhost:3000/stores/1?table=A1&userId=1
내 맛집 지도 (로그인 필요): http://localhost:3000/stores/map
점주 로그인 → 대시보드:  http://localhost:3000/dashboard
점주 대시보드 (데모):    http://localhost:3000/dashboard/1

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
