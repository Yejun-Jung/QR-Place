# QR-Place

> **배포된 서비스: <https://qr-place.vercel.app>**
> 점주는 `/dashboard` 에서 카카오 로그인 → 매장 등록 → 테이블 QR 생성,
> 손님은 그 QR을 스캔해 메뉴판으로 들어온다.

QR 스캔만으로 메뉴 확인부터 통계 분석까지 제공하는 스마트 마케팅 플랫폼 (캡스톤디자인 1인 프로젝트).
QR 스캔 → 메뉴 조회 → **장바구니 → 결제 → 주문 완료** → 쌓인 주문으로 다음 방문 시 개인화 추천.

태블릿 테이블오더는 초기 하드웨어 비용 때문에 영세 식당이 못 쓴다는 문제에서 출발했다.
손님 스마트폰만으로 구동해 설치 비용을 없애고, 쌓인 주문·조회 로그를 태그 가중치로 집계해
**손님마다 메뉴판 정렬이 달라지는 초개인화**를 얹은 것이 핵심 차별점이다.
추천은 외부 AI API 없이 **자체 DB 쿼리 기반 룰 기반 가중치 추천**.

결제는 **데모용 모의 결제**(실제 카드 승인·청구 없음). 실제 PG 연동 지점은
`app/api/orders/[orderId]/pay/route.ts` 주석에 표시.

## 주요 기능

| 대상 | 기능 |
|---|---|
| 손님 | 개인화 메뉴판(카테고리 원페이지 스크롤), 장바구니·주문·모의 결제 |
| 손님 | 🎰 룰렛 이벤트 — 하루 1회, 당첨 시 추천 메뉴 **0원 무료증정**(서버 추첨) |
| 손님 | 🍽️ 나의 취향 리포트 — 관심 카테고리 그래프 + 한 줄 요약 |
| 손님 | "함께 많이 시켜요" — 결제 데이터 기반 메뉴 페어링 추천 |
| 손님 | 🗺️ 내 맛집 지도 — 카카오맵에 방문 매장 핀 표시 |
| 점주 | 카카오 로컬 API 장소 검색으로 매장 등록, 메뉴 CRUD |
| 점주 | 테이블별 QR 생성·이미지 다운로드 |
| 점주 | 매출·방문자·인기메뉴 통계 대시보드(Chart.js), 결제 대기 주문 실시간 확인 |

DB는 **드라이버 2개**를 지원한다:

- **SQLite** (기본값) — Node 내장 `node:sqlite`. 설치·세팅 없이 `npm run dev` 만으로 데모가 돈다.
  최초 실행 시 `qr-place.db` 파일에 스키마 + 시드가 자동 생성됨.
- **Vercel Postgres** (스펙의 정식 스택) — `POSTGRES_URL` 을 주면 자동으로 이쪽을 쓴다.

## 빠른 시작 (DB 없이)

```bash
npm install
npm run dev
```

- 고객 메뉴판(비로그인·인기순): <http://localhost:3000/stores/1?table=A1>
- 개인화(유저 1 · 매운맛 취향): <http://localhost:3000/stores/1?table=A1&userId=1>
- 점주 대시보드: <http://localhost:3000/dashboard> (카카오 로그인 → 내 매장 등록 → 내 대시보드)

> 점주용 API(매출 통계·주문 목록·메뉴 CRUD)는 **그 매장의 소유자만** 접근할 수 있다.
> 그래서 시드에 들어있는 매장(`/dashboard/1`)은 주인이 없어 열리지 않는다 —
> `/dashboard` 로 들어가 매장을 등록하면 그 계정이 소유자가 되고 대시보드가 열린다.

### 고객 주문 흐름

메뉴판(`/stores/1`) → 메뉴 탭해서 수량 담기 → 하단 장바구니 바 →
`/stores/1/cart` 수량 조정 → **주문하기**(주문 생성) →
`/stores/1/checkout` 결제수단·카드입력(모의) → **결제하기** →
`/stores/1/orders/{id}` 주문 완료. 결제 확정 시 각 메뉴가 `view_logs` 에
`order` 로 적재돼 추천·통계에 즉시 반영된다.

DB를 초기화하려면: `npm run db:reset` (`qr-place.db` 삭제 → 다음 실행 때 재시드)
초기화 후에는 브라우저에 남아있던 로그인 세션 쿠키가 예전 유저 id(시드는 1~2, 실제 카카오 로그인은 3+)를
가리켜 더 이상 존재하지 않거나 다른 계정을 가리킬 수 있다 — 이상 동작/500 에러가 보이면 로그아웃(또는 쿠키 삭제) 후 재시도.

## 테스트

```bash
npm run lint      # ESLint (flat config, eslint.config.mjs)
npm test          # 유닛 테스트 45개 — 추천·권한 가드·주문 검증·문구·QR·카카오·지도
npm run smoke     # SQLite 어댑터 쿼리 스모크 (로컬 qr-place.db)
```

## Postgres 로 전환

```bash
npx vercel link
npx vercel env pull .env.local        # POSTGRES_URL 채워짐
npm run db:setup:pg                   # db/schema.sql + db/seed.sql 적용
npm run dev
```

`DB_DRIVER=sqlite` 를 주면 `POSTGRES_URL` 이 있어도 SQLite 로 강제할 수 있다.

## 카카오맵 (내 맛집 지도)

`/stores/map` (카카오 로그인 후 방문 매장을 지도 핀으로 표시)을 쓰려면
`.env.local` 에 `NEXT_PUBLIC_KAKAO_MAP_KEY` 를 설정해야 한다 — 카카오 개발자
콘솔 앱의 **JavaScript 키**이며, 장소 검색에 쓰는 `KAKAO_REST_API_KEY` 와는
다른 키다. 또한 그 키를 서비스할 도메인(`http://localhost:3000`, 배포된
Vercel 도메인)을 콘솔의 **JS SDK 도메인**으로 등록해야 지도가 뜬다 —
미등록 시 로딩이 도메인 거부 에러로 실패한다. `NEXT_PUBLIC_*` 값은 Next.js
빌드 타임에 번들에 박히므로, Vercel 배포 시 빌드 실행 전에 설정돼 있어야
한다.

## 폴더 구조

```
db/
  schema.sql / seed.sql        Postgres용 스키마·시드 (SQLite는 lib/db.sqlite.ts에 인라인)
lib/
  types.ts                     공용 타입 (메뉴·주문·결제)
  recommend.ts                 태그 가중치 계산 + 정렬 (순수 함수, 스펙 4장)
  blurb.ts                     자연어 추천 문구 (스펙 7, 규칙 기반)
  useCart.ts                   장바구니 훅 (localStorage, 테이블 단위)
  mapView.ts                   카카오맵 중심좌표 계산 (순수 함수)
  authz.ts                     API 권한 가드 (점주 소유권 / 주문 소유권)
  qr.ts                        테이블별 QR URL 생성 (순수 함수)
  kakao.ts                     카카오 로컬 검색 응답 정규화 (순수 함수)
  db.ts                        드라이버 선택 + 공용 인터페이스(DbAdapter)
  db.sqlite.ts                 SQLite 어댑터 (기본)
  db.postgres.ts               Vercel Postgres 어댑터
  __tests__/                   유닛 테스트 (recommend / authz / ordersRoute / blurb / qr / kakao / mapView)
app/
  globals.css                                 전역 스타일 진입점 (styles/ 를 순서대로 @import)
  styles/                                     화면 단위로 나눈 CSS (import 순서 = cascade 순서)
  ui/AppHeader.tsx                            공용 헤더(뒤로가기)
  ui/KakaoLoginCard.tsx                       로그인 필요 화면 공용 카드
  api/logs/route.ts                           POST 조회/주문 로그      (스펙 5)
  api/orders/route.ts                         POST 주문 생성 (+무료증정 검증)
  api/orders/[orderId]/route.ts               GET  주문 상세
  api/orders/[orderId]/pay/route.ts           POST 모의 결제 (+추천 로그 적재)
  api/orders/[orderId]/cancel/route.ts        POST 결제 포기 시 pending 주문 삭제
  api/stores/[storeId]/route.ts               GET  매장 정보
  api/stores/[storeId]/menus/route.ts         GET  개인화 메뉴 목록    (스펙 4-1 / 4-2)
  api/stores/[storeId]/menus/[menuId]/route.ts GET 페어링 추천 / PUT·DELETE 메뉴 관리
  api/stores/[storeId]/roulette/route.ts      POST 룰렛 스핀 (서버 추첨)
  api/stores/[storeId]/orders/route.ts        GET  점주용 주문 목록
  api/stores/[storeId]/stats/route.ts         GET  점주 통계(+매출)    (스펙 4-3 / 5)
  stores/[storeId]/page.tsx                   메뉴판 (카테고리 섹션·추천·담기)
  stores/[storeId]/RouletteModal.tsx          룰렛 슬롯머신 모달
  stores/[storeId]/cart/page.tsx              장바구니
  stores/[storeId]/checkout/page.tsx          결제 (수단 선택·카드입력)
  stores/[storeId]/orders/[orderId]/page.tsx  주문 완료
  stores/map/page.tsx                         내 맛집 지도 (로그인 후 방문 매장 핀)
  stores/map/MapCanvas.tsx                    카카오맵 SDK 로딩 + 마커/오버레이 렌더
  stores/taste/page.tsx                       나의 취향 리포트 (태그 가중치 집계)
  dashboard/page.tsx                          점주 진입 (로그인 → 내 매장으로)
  dashboard/new/page.tsx                      매장 등록 (카카오 로컬 검색)
  dashboard/[storeId]/page.tsx                점주 대시보드 (Chart.js)
  dashboard/[storeId]/menus/page.tsx          메뉴 관리 (CRUD)
  dashboard/[storeId]/qr/page.tsx             테이블 QR 생성·다운로드
scripts/
  db.mjs                       Postgres schema+seed 실행기
  smoke.mjs                    SQLite 어댑터 스모크 테스트
```

## 추천 알고리즘 요약 (스펙 4장)

1. `view_logs` 에서 유저의 최근 로그(기본 30일) + 메뉴 태그를 조인해 가져온다.
2. 태그 토큰(`category:찌개`, `spicy:3`, `price_range:mid`)별로 가중치를 합산한다.
   `order` = 2배, `view` = 1배.
3. 가중치 상위 3개 태그를 뽑는다.
4. 각 메뉴의 태그가 상위 태그와 겹치면 그 가중치만큼 `recommendScore` 를 준다.
5. `recommendScore` 내림차순 → 동점이면 매장 인기순(최근 주문 수)으로 정렬.
6. 로그가 없으면(비로그인/신규) 모든 점수가 0 → **자동으로 인기순 = 콜드 스타트**.

## API

권한 표기 — 🟢 공개 / 🔵 로그인 필요 / 🔴 해당 매장 점주만 / 🟡 주문 소유자만

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/stores/[storeId]` | 🟢 | 매장 정보 |
| GET | `/api/stores/[storeId]/menus?userId=&days=30` | 🟢 | 개인화 정렬 메뉴 (userId 없으면 인기순) |
| GET | `/api/stores/[storeId]/menus/[menuId]` | 🟢 | 함께 많이 시킨 메뉴 top3 (페어링 추천) |
| POST | `/api/logs` | 🟢 | `{ userId?, storeId, menuId, tableNumber?, actionType }` 조회/주문 로그 |
| GET | `/api/kakao/search?q=` | 🟢 | 카카오 로컬 장소 검색 (매장 등록용) |
| POST | `/api/orders` | 🟢 | `{ storeId, tableNumber?, userId?, items:[{menuId,quantity,free?}] }` → pending 주문 |
| GET | `/api/orders/[orderId]` | 🟢 | 주문 상세 (+ 매장명) |
| POST | `/api/orders/[orderId]/pay` | 🟡 | `{ paymentMethod, tableNumber }` → 모의 결제 |
| POST | `/api/orders/[orderId]/cancel` | 🟡 | `{ tableNumber }` → pending 주문 완전 삭제 |
| POST | `/api/stores` | 🔵 | 매장 등록 (등록한 계정이 소유자가 된다) |
| POST | `/api/stores/[storeId]/roulette` | 🔵 | 룰렛 스핀 — **서버가 상품 추첨** 후 기록, 하루 1회 |
| POST | `/api/stores/[storeId]/menus` | 🔴 | 메뉴 생성 |
| PUT / DELETE | `/api/stores/[storeId]/menus/[menuId]` | 🔴 | 메뉴 수정 / 삭제 |
| GET | `/api/stores/[storeId]/orders?range=7d` | 🔴 | 점주용 주문 목록 |
| GET | `/api/stores/[storeId]/stats?range=7d` | 🔴 | 방문자 / 인기 메뉴 / 일별 매출 |

### 신뢰 경계 (클라이언트를 믿지 않는 지점)

- **가격·이름**: `POST /api/orders` 에서 서버가 DB 기준으로 다시 계산해 스냅샷 저장.
- **무료증정(0원) 항목**: 룰렛 상품 추첨을 서버가 하고 `roulette_spins` 에 기록한 뒤,
  주문 생성 시 그 기록과 대조해야 통과한다. `redeemed_at` 으로 같은 당첨의 재사용도 막는다.
- **점주 데이터**: 매출·주문·메뉴 CRUD 는 `stores.owner_user_id` 와 세션이 일치해야 한다.
  메뉴 단건 조작은 그 메뉴가 해당 매장 것인지까지 확인한다.
- **주문 결제·취소**: 주문 id 가 순차 정수라, 테이블 번호나 본인 세션이 일치해야 허용한다.

가드는 `lib/authz.ts` 한 곳에 모여 있고, `lib/__tests__/authz.test.ts` 로 통과/차단 양쪽을 고정해뒀다.

## 스펙과 다른 점 (의도적)

- 테이블명: `User/Store/Menu/View_Log` → `users/stores/menus/view_logs`
  (`user` 는 Postgres 예약어).
- Next.js 15 라서 route handler `params` 가 `Promise` → `await params`.
- SQLite 데모 드라이버를 추가 (스펙엔 없지만 "DB 없이 돌아가게" 요구 반영).
  Node 22.5+ 필요.
- LLM 자연어 추천(스펙 7)은 `lib/blurb.ts` 에 규칙 기반 stub. 순위는 룰 기반 유지.
- 룰렛 이벤트(스펙 7)는 화면까지 완성 — 당첨 상품 추첨은 서버(`/api/stores/[id]/roulette`)가
  하고, "추천 메뉴 무료 증정" 당첨분만 주문에서 0원으로 통과된다.
- **나의 취향 리포트 / 메뉴 페어링 추천**은 스펙엔 없지만 차별점 보강으로 추가.
- **주문/결제 화면**은 스펙엔 없지만 "실제로 작동 + 결제 UI" 요구로 추가.
  결제는 모의 처리이며, 실제 토스페이먼츠/카카오페이 연동은
  `app/api/orders/[orderId]/pay/route.ts` 주석의 절차대로 붙이면 된다.

## 참고: `@vercel/postgres` 는 deprecated

Vercel Postgres 는 Neon 으로 이관됐다. `@vercel/postgres` 패키지는 여전히
Neon 기반 DB(`POSTGRES_URL`)에 그대로 동작하므로 캡스톤 범위에선 충분하다.
정식으로 옮기려면 `@neondatabase/serverless` 로 교체하고 `lib/db.postgres.ts` 의
`sql` import 만 바꾸면 된다 (쿼리 문법 동일).
