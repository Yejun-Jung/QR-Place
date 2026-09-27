# QR-Place

> **배포된 서비스: <https://qr-place.vercel.app>**
> 점주는 `/dashboard` 에서 카카오 로그인 → 매장 등록 → 테이블 QR 생성,
> 손님은 그 QR을 스캔해 메뉴판으로 들어온다.

QR 스캔만으로 메뉴 확인부터 통계 분석까지 제공하는 스마트 마케팅 플랫폼 (캡스톤디자인 1인 프로젝트).

태블릿 테이블오더는 초기 하드웨어 비용 때문에 영세 식당이 쓰기 어렵다는 문제에서 출발했다.
손님 스마트폰만으로 구동해 설치 비용을 없애고, 쌓인 주문·조회 로그를 태그 가중치로 집계해
**손님마다 메뉴판 정렬이 달라지는 초개인화 추천**을 얹은 것이 핵심 차별점이다.
추천은 외부 AI API 없이 **자체 DB 쿼리 기반 룰 기반 가중치 추천**으로 구현했다.

결제는 **데모용 모의 결제**(실제 카드 승인·청구 없음)다. 실제 PG 연동 지점은
`app/api/orders/[orderId]/pay/route.ts` 주석에 표시해 두었다.

## 주요 기능

| 대상 | 기능 |
|---|---|
| 손님 | 개인화 메뉴판 — 카테고리 원페이지 스크롤, 로그인 시 취향 순 정렬, 비로그인 시 인기순 |
| 손님 | 장바구니(담기 토스트 안내) → 주문 → 모의 결제(카드/카카오페이/현장결제) |
| 손님 | 🔔 주문 상태 알림 — 점주가 완료/거절하면 화면 알림 + 안드로이드 진동 |
| 손님 | 🧾 내 주문 기록 — 휴대폰(쿠키)·로그인 계정 기준으로 본인 주문만 표시 |
| 손님 | 🎰 룰렛 이벤트 — 매장별 하루 1회, 당첨 시 추천 메뉴 **0원 무료증정**(서버 추첨) |
| 손님 | 🍽️ 나의 취향 리포트 — 관심 카테고리 그래프 + 한 줄 요약 |
| 손님 | "함께 많이 시켜요" — 결제 데이터 기반 메뉴 페어링 추천 |
| 손님 | 🗺️ 내 맛집 지도 — 카카오맵에 방문 매장 핀 표시 |
| 점주 | 카카오 로컬 장소 검색으로 매장 등록, 메뉴 등록·수정·삭제(사진 업로드) |
| 점주 | 메뉴 **품절 / 품절 해제** — 품절 메뉴는 손님 메뉴판에서 담을 수 없고 서버에서도 주문 차단 |
| 점주 | 테이블별 QR 생성·이미지 다운로드 |
| 점주 | 주문 접수 — 결제된 주문을 완료/거절, **매일 1번부터 시작하는 주문번호** |
| 점주 | 🔔 새 주문 알림 — 종소리 "띵동" + 음성 안내, 탭 제목에 대기 주문 수 |
| 점주 | 매출·방문자·인기 메뉴 통계 대시보드 (Chart.js, 최근 7/14/30일) |

## 빠른 시작 (DB 설정 없이)

Node **22.5 이상**이 필요하다 (내장 `node:sqlite` 사용).

```bash
npm install
npm run dev
```

아무 설정 없이 실행하면 **SQLite**(`qr-place.db`)를 쓰며, 첫 실행 때 스키마와 샘플 데이터가 자동으로 만들어진다.

- 고객 메뉴판(비로그인·인기순): <http://localhost:3000/stores/1?table=A1>
- 개인화 메뉴판(샘플 유저 1 · 매운맛 취향): <http://localhost:3000/stores/1?table=A1&userId=1>
  (`?userId=` 는 로컬 데모용이다. 배포본에서는 무시되고 카카오 로그인 세션만 쓴다)
- 점주 대시보드: <http://localhost:3000/dashboard> (카카오 로그인 필요 — 아래 환경 변수 참고)

> 점주용 화면은 **그 매장을 등록한 계정만** 열 수 있다. 샘플 매장(`/dashboard/1`)은 주인이 없어
> 열리지 않으니, `/dashboard` 에서 매장을 새로 등록해 확인한다.

DB 초기화: `npm run db:reset` (`qr-place.db` 삭제 → 다음 실행 때 다시 생성).
초기화 후 이상 동작이 보이면 예전 로그인 쿠키 때문이니 로그아웃 후 다시 시도한다.

## 환경 변수

`.env.local` 에 넣는다. 없으면 해당 기능만 꺼지고 나머지는 동작한다. 예시는 `.env.example` 참고.

| 변수 | 용도 | 없으면 |
|---|---|---|
| `AUTH_SECRET` | 로그인 세션 암호화 키 (NextAuth) | 카카오 로그인 불가 |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` | 카카오 로그인 (REST API 키 / 클라이언트 시크릿) | 카카오 로그인 불가 |
| `KAKAO_REST_API_KEY` | 매장 등록 시 카카오 로컬 장소 검색 | 장소 검색 불가 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 내 맛집 지도 (카카오 **JavaScript 키**) | 지도 안 뜸 |
| `BLOB_READ_WRITE_TOKEN` | 메뉴 사진 업로드 (Vercel Blob) | 사진 업로드 불가 |
| `POSTGRES_URL` | 배포 DB (Neon Postgres). 있으면 SQLite 대신 사용 | SQLite 사용 |
| `DB_DRIVER` | `sqlite` / `postgres` 로 강제 지정 (선택) | 자동 선택 |

- 카카오맵은 서비스 도메인(`http://localhost:3000`, 배포 도메인)을 카카오 개발자 콘솔의 **JS SDK 도메인**으로 등록해야 뜬다.
- `NEXT_PUBLIC_*` 값은 빌드할 때 번들에 들어가므로, Vercel에서는 빌드 전에 설정돼 있어야 한다.

### Postgres(배포 DB)로 실행

```bash
npx vercel link
npx vercel env pull .env.local        # POSTGRES_URL 등 채워짐
npm run db:setup:pg                   # db/schema.sql + db/seed.sql 적용
npm run dev
```

`POSTGRES_URL` 이 있어도 `DB_DRIVER=sqlite` 를 주면 로컬 SQLite로 실행한다
(배포 DB에 테스트 데이터가 쌓이지 않게 할 때).

## 테스트

```bash
npm run lint      # ESLint
npm test          # Vitest 60개 — 추천·권한 가드·주문 검증·주문번호·조사 처리·차트 날짜·QR·카카오·지도
npm run smoke     # SQLite 어댑터 쿼리 스모크 (로컬 qr-place.db)
```

## 추천 알고리즘

1. `view_logs` 에서 유저의 최근 30일 조회·주문 로그와 메뉴 태그를 가져온다.
2. 태그(`category:찌개`, `spicy:3`, `price_range:mid`)별로 가중치를 합산한다. 주문 = 2점, 조회 = 1점.
3. 가중치 상위 3개 태그를 뽑는다.
4. 메뉴 태그가 상위 태그와 겹치면 그 가중치만큼 `recommendScore` 를 준다.
5. `recommendScore` 내림차순 → 같으면 매장 인기순(최근 주문 수)으로 정렬한다.
6. 로그가 없으면(비로그인·신규) 모든 점수가 0이라 **자동으로 인기순**이 된다 (콜드 스타트).
   음료·주류는 어떤 메뉴와도 같이 팔려서 인기순 집계에서 뺀다.

## API

권한 — 🟢 공개 / 🔵 로그인 필요 / 🔴 해당 매장 점주만 / 🟡 주문한 손님만

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/stores/[storeId]` | 🟢 | 매장 정보 |
| GET | `/api/stores/[storeId]/menus` | 🟢 | 개인화 정렬 메뉴 (비로그인은 인기순) |
| GET | `/api/stores/[storeId]/menus/[menuId]` | 🟢 | 함께 많이 시킨 메뉴 top3 (품절 제외) |
| POST | `/api/logs` | 🟢 | 메뉴 조회 로그 |
| GET | `/api/kakao/search?q=` | 🟢 | 카카오 로컬 장소 검색 |
| POST | `/api/orders` | 🟢 | 주문 생성 (가격은 서버가 다시 계산, 품절·무료증정 검증) |
| GET | `/api/orders/[orderId]` | 🟢 | 주문 상세 |
| POST | `/api/orders/[orderId]/pay` | 🟡 | 모의 결제 → 오늘 주문번호 부여 + 추천 로그 적재 |
| POST | `/api/orders/[orderId]/cancel` | 🟡 | 결제 전 주문 취소(삭제) |
| GET | `/api/stores/[storeId]/orders/mine` | 🟡 | 내 주문 기록 (휴대폰 쿠키·로그인 기준) |
| POST | `/api/stores` | 🔵 | 매장 등록 (등록한 계정이 점주가 된다) |
| POST | `/api/stores/[storeId]/roulette` | 🔵 | 룰렛 스핀 — 서버가 상품 추첨, 하루 1회 |
| POST | `/api/stores/[storeId]/menus` | 🔴 | 메뉴 생성 |
| PUT / DELETE | `/api/stores/[storeId]/menus/[menuId]` | 🔴 | 메뉴 수정 / 삭제 |
| PATCH | `/api/stores/[storeId]/menus/[menuId]` | 🔴 | `{ soldOut }` 품절 / 품절 해제 |
| POST | `/api/stores/[storeId]/upload` | 🔴 | 메뉴 사진 업로드 (Vercel Blob) |
| GET | `/api/stores/[storeId]/orders?range=7d` | 🔴 | 점주용 주문 목록 |
| POST | `/api/orders/[orderId]/status` | 🔴 | 주문 완료 / 거절 |
| GET | `/api/stores/[storeId]/stats?range=7d` | 🔴 | 방문자 / 인기 메뉴 / 일별 매출 |

### 신뢰 경계 (클라이언트를 믿지 않는 지점)

- **가격·이름**: 주문 생성 때 서버가 DB 기준으로 다시 계산해 스냅샷으로 저장한다.
- **품절**: 장바구니에 담아둔 사이 품절돼도 주문 생성 단계에서 서버가 막는다.
- **무료증정(0원) 항목**: 룰렛 상품은 서버가 추첨해 `roulette_spins` 에 기록하고, 주문 생성 때
  그 기록과 대조해야 통과한다. `redeemed_at` 으로 같은 당첨의 재사용도 막는다.
- **점주 데이터**: 매출·주문·메뉴 관리는 `stores.owner_user_id` 와 로그인 세션이 일치해야 한다.
  메뉴 단건 조작은 그 메뉴가 해당 매장 것인지까지 확인한다.
- **주문 결제·취소**: 주문 id 가 순차 번호라, 테이블 번호나 본인 세션이 일치해야 허용한다.
- **내 주문 기록**: 첫 주문 때 휴대폰에 `qp_guest` 쿠키(httpOnly)를 발급해 주문과 함께 저장한다.
  같은 테이블의 다른 손님 주문은 보이지 않는다.
- **유저 id**: 로그·주문·개인화 조회는 로그인 세션의 id 만 쓴다. 클라이언트가 보낸 `userId` 는
  개발 환경의 데모 흐름에서만 받는다.

권한 확인은 `lib/authz.ts` 한 곳에 모여 있고, `lib/__tests__/authz.test.ts` 가 통과·차단 양쪽을 검증한다.

## 폴더 구조

```
db/
  schema.sql / seed.sql        Postgres 스키마·샘플 데이터 (SQLite는 lib/db.sqlite.ts에 포함)
lib/
  db.ts                        DB 드라이버 선택 + 공용 인터페이스
  db.sqlite.ts / db.postgres.ts  SQLite(로컬 기본) / Postgres(배포) 구현
  recommend.ts                 태그 가중치 추천 (순수 함수)
  blurb.ts                     메뉴판 상단 추천 문구
  authz.ts                     API 권한 확인 (점주 소유권 / 주문 소유권 / 유저 id)
  types.ts                     공용 타입, 주문 상태·주문번호 표시
  useCart.ts                   장바구니 (localStorage, 테이블 단위)
  chartDays.ts                 통계 차트의 빈 날짜를 0으로 채움
  josa.ts                      "통닭이 / 소주가 담겼습니다" 조사 처리
  qr.ts / kakao.ts / mapView.ts  QR URL · 카카오 검색 결과 정리 · 지도 중심 계산
  __tests__/                   Vitest 단위 테스트 (10개 파일, 60개)
app/
  stores/[storeId]/            손님: 메뉴판 · 장바구니 · 결제 · 주문 상태 · 주문 기록 · 룰렛
  stores/map/                  손님: 내 맛집 지도 (카카오맵)
  stores/taste/                손님: 나의 취향 리포트
  dashboard/                   점주: 로그인 · 매장 등록 · 대시보드 · 메뉴 관리 · QR 생성
  api/                         위 API 표의 라우트
  ui/                          공용 헤더 · 카카오 로그인 카드 · 폴링 · 진동 등
  styles/                      화면별 CSS
scripts/
  db.mjs                       Postgres 스키마·샘플 데이터 적용
  smoke.mjs                    SQLite 어댑터 스모크 테스트
```

DB 테이블: `users` · `stores` · `menus` · `view_logs` · `orders` · `order_items` · `roulette_spins`
(자세한 컬럼은 `db/schema.sql`).
