# QR-Place

`QR-Place-추천기능-스펙.md` 를 구현한 Next.js(App Router) 프로젝트.
QR 스캔 → 메뉴 조회 → **장바구니 → 결제 → 주문 완료** → 쌓인 주문으로 다음 방문 시 개인화 추천.

추천은 외부 API 없이 **자체 DB 쿼리 기반 룰 기반 가중치 추천**(스펙 방식 A).
결제는 **데모용 모의 결제**(실제 카드 승인·청구 없음). 실제 PG 연동 지점은
`app/api/orders/[orderId]/pay/route.ts` 주석에 표시.

이 프로젝트는 개인 포트폴리오 사이트와 아무 연동/공유 코드가 없는 독립 프로젝트다.

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
- 점주 대시보드: <http://localhost:3000/dashboard/1>

### 고객 주문 흐름

메뉴판(`/stores/1`) → 메뉴 탭해서 수량 담기 → 하단 장바구니 바 →
`/stores/1/cart` 수량 조정 → **주문하기**(주문 생성) →
`/stores/1/checkout` 결제수단·카드입력(모의) → **결제하기** →
`/stores/1/orders/{id}` 주문 완료. 결제 확정 시 각 메뉴가 `view_logs` 에
`order` 로 적재돼 추천·통계에 즉시 반영된다.

DB를 초기화하려면: `npm run db:reset` (`qr-place.db` 삭제 → 다음 실행 때 재시드)

## 테스트

```bash
npm test          # 추천 로직 유닛 테스트 (순수 함수, DB 불필요)
npm run smoke     # SQLite 어댑터 6개 쿼리 스모크 (인메모리)
```

## Postgres 로 전환

```bash
npx vercel link
npx vercel env pull .env.local        # POSTGRES_URL 채워짐
npm run db:setup:pg                   # db/schema.sql + db/seed.sql 적용
npm run dev
```

`DB_DRIVER=sqlite` 를 주면 `POSTGRES_URL` 이 있어도 SQLite 로 강제할 수 있다.

## 폴더 구조

```
db/
  schema.sql / seed.sql        Postgres용 스키마·시드 (SQLite는 lib/db.sqlite.ts에 인라인)
lib/
  types.ts                     공용 타입 (메뉴·주문·결제)
  recommend.ts                 태그 가중치 계산 + 정렬 (순수 함수, 스펙 4장)
  blurb.ts                     자연어 추천 문구 (스펙 7, 규칙 기반)
  useCart.ts                   장바구니 훅 (localStorage, 테이블 단위)
  db.ts                        드라이버 선택 + 공용 인터페이스(DbAdapter)
  db.sqlite.ts                 SQLite 어댑터 (기본)
  db.postgres.ts               Vercel Postgres 어댑터
  __tests__/recommend.test.ts  추천 로직 유닛 테스트
app/
  ui/AppHeader.tsx                            공용 헤더(뒤로가기)
  api/logs/route.ts                           POST 조회/주문 로그      (스펙 5)
  api/orders/route.ts                         POST 주문 생성
  api/orders/[orderId]/route.ts               GET  주문 상세
  api/orders/[orderId]/pay/route.ts           POST 모의 결제 (+추천 로그 적재)
  api/stores/[storeId]/route.ts               GET  매장 정보
  api/stores/[storeId]/menus/route.ts         GET  개인화 메뉴 목록    (스펙 4-1 / 4-2)
  api/stores/[storeId]/orders/route.ts        GET  점주용 주문 목록
  api/stores/[storeId]/stats/route.ts         GET  점주 통계(+매출)    (스펙 4-3 / 5)
  stores/[storeId]/page.tsx                   메뉴판 (카테고리·추천·담기)
  stores/[storeId]/cart/page.tsx              장바구니
  stores/[storeId]/checkout/page.tsx          결제 (수단 선택·카드입력)
  stores/[storeId]/orders/[orderId]/page.tsx  주문 완료
  dashboard/[storeId]/page.tsx                점주 대시보드 (Chart.js)
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

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/stores/[storeId]` | 매장 정보 |
| GET | `/api/stores/[storeId]/menus?userId=&days=30` | 개인화 정렬 메뉴 (userId 없으면 인기순) |
| POST | `/api/logs` | `{ userId?, storeId, menuId, tableNumber?, actionType }` 조회/주문 로그 |
| POST | `/api/orders` | `{ storeId, tableNumber?, userId?, items:[{menuId,quantity}] }` → pending 주문 |
| GET | `/api/orders/[orderId]` | 주문 상세 (+ 매장명) |
| POST | `/api/orders/[orderId]/pay` | `{ paymentMethod: card\|kakaopay\|counter }` → 모의 결제 |
| GET | `/api/stores/[storeId]/orders?range=7d` | 점주용 주문 목록 |
| GET | `/api/stores/[storeId]/stats?range=7d` | 방문자 / 인기 메뉴 / 일별 매출 |

가격·이름은 `POST /api/orders` 에서 **서버가 DB 기준으로 다시 계산**해 스냅샷으로 저장한다(클라 위조 방지).

## 스펙과 다른 점 (의도적)

- 테이블명: `User/Store/Menu/View_Log` → `users/stores/menus/view_logs`
  (`user` 는 Postgres 예약어).
- Next.js 15 라서 route handler `params` 가 `Promise` → `await params`.
- SQLite 데모 드라이버를 추가 (스펙엔 없지만 "DB 없이 돌아가게" 요구 반영).
  Node 22.5+ 필요.
- LLM 자연어 추천(스펙 7)은 `lib/blurb.ts` 에 규칙 기반 stub. 순위는 룰 기반 유지.
- 룰렛 이벤트(스펙 7)는 `recommend.ts` 의 `pickRoulette()` 순수 함수로만 준비.
- **주문/결제 화면**은 스펙엔 없지만 "실제로 작동 + 결제 UI" 요구로 추가.
  결제는 모의 처리이며, 실제 토스페이먼츠/카카오페이 연동은
  `app/api/orders/[orderId]/pay/route.ts` 주석의 절차대로 붙이면 된다.

## 참고: `@vercel/postgres` 는 deprecated

Vercel Postgres 는 Neon 으로 이관됐다. `@vercel/postgres` 패키지는 여전히
Neon 기반 DB(`POSTGRES_URL`)에 그대로 동작하므로 캡스톤 범위에선 충분하다.
정식으로 옮기려면 `@neondatabase/serverless` 로 교체하고 `lib/db.postgres.ts` 의
`sql` import 만 바꾸면 된다 (쿼리 문법 동일).
