# QR-Place — Claude Code 인수인계 문서

## 프로젝트 개요

- **프로젝트:** QR-Place — QR코드 스캔만으로 메뉴 확인부터 통계 분석까지 제공하는 스마트 마케팅 플랫폼
- **목적:** 캡스톤디자인 개인 프로젝트 (1인 개발, 조기취업 병행)
- **배포:** https://qr-place.vercel.app (Vercel + Neon Postgres)
- **사용자:** 점주(PC 대시보드) / 손님(QR로 들어오는 모바일 웹)

**핵심 차별점:** 태블릿 없이 손님 스마트폰으로 주문(설치비 0원) + 조회·주문 로그의 태그 가중치로
손님마다 메뉴판 정렬이 달라지는 **초개인화 추천**. AI/딥러닝 없이 DB 집계로 구현.
취향 리포트 · 메뉴 페어링 · 룰렛(0원 무료증정이 실제 결제까지 반영)을 한 흐름으로 묶었다.

기능 목록·API·환경 변수는 README.md, 제출용 계획서는 사용자의 Downloads 폴더
`정예준 - 개인 프로젝트 계획서 (수정).docx` 에 있다. 기능을 바꾸면 둘 다 같이 맞춘다.

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트·백엔드 | Next.js 15 (App Router, TypeScript) |
| DB | SQLite(로컬, `node:sqlite`) / Neon Postgres(배포, `@vercel/postgres`) — `lib/db.ts` 가 자동 선택 |
| 인증 | NextAuth v5 + 카카오 OAuth (`auth.ts`) |
| 외부 API | 카카오 로컬(장소 검색), 카카오맵(`react-kakao-maps-sdk`) |
| 기타 | Chart.js, Vercel Blob(메뉴 사진), qrcode |
| 품질 | Vitest 60개, ESLint(flat config) |

---

## ⚠️ 작업할 때 꼭 지킬 것

1. **로컬 테스트는 SQLite로.** `.env.local` 에 배포 DB의 `POSTGRES_URL` 이 들어 있어서
   그냥 `npm run dev` 하면 **배포 DB에 연결된다.** 테스트 주문을 넣을 땐
   `DB_DRIVER=sqlite` 로 실행한다 (예: `DB_DRIVER=sqlite npx next dev -p 3001`).
2. **배포 DB 스키마 변경은 사용자가 Neon SQL Editor에서 먼저 실행 → 그다음 push.**
   코드가 새 컬럼을 읽는데 컬럼이 없으면 배포 사이트가 바로 깨진다.
   Claude는 배포 DB에 직접 쓰기 권한이 없다(권한 설정에서 막힘). SQL을 건네고 실행을 부탁한다.
   - Neon SQL Editor는 **한 번에 한 문장만** 실행되고, 쓰기 전엔 **Read-only 스위치를 꺼야** 한다.
   - `db/schema.sql` 에도 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 로 같이 적어 두고,
     SQLite는 `lib/db.sqlite.ts` 의 `PRAGMA table_info` 마이그레이션에 추가한다.
   - `npm run db:setup:pg` 는 시드까지 다시 넣어 view_logs가 중복되므로 배포 DB에 돌리지 않는다.
3. **Postgres 전용 코드(`lib/db.postgres.ts`)는 로컬에서 실행해 볼 수 없다.** 바꿀 땐 SQLite 쪽과
   같은 로직인지 대조하고, 위험한 변경(주문·결제 쿼리)은 신중히.
4. 커밋·push는 사용자가 요청할 때. 사용자는 기능마다 "커밋 → push → 배포 사이트에서 테스트" 순서로 확인한다.
5. 테스트 주문을 넣었으면 제출 전 삭제 SQL을 안내한다 (아래 "테스트 데이터 정리").

---

## DB 스키마 (`db/schema.sql`, SQLite는 `lib/db.sqlite.ts`)

- **users**: id, kakao_id(UNIQUE), nickname
- **stores**: id, kakao_place_id, name, latitude, longitude, owner_user_id(점주)
- **menus**: id, store_id, name, price, description, tags(JSONB), image_url, sold_out
  - tags 예: `{"category": "찌개", "spicy": 3, "price_range": "mid"}` — 가격대는 점주가 선택(저가/중가/고가)
- **view_logs**: id, user_id(NULL=비로그인), table_number, store_id, menu_id, action_type(view|order), created_at
- **orders**: id, daily_no, store_id, user_id, table_number, guest_token, status, payment_method, total_amount, created_at, paid_at
  - status: pending(결제 대기) → paid(접수 대기) → served(준비 완료) / rejected(거절됨), cancelled
  - **daily_no**: 결제 완료 때 "오늘(한국 시간) 이 매장의 N번째"로 매김. 화면엔 id 대신 이걸 보여준다
    (`orderNoLabel`: 결제 전은 "(결제 전)", 기능 도입 전 옛 주문은 `#id`).
  - **guest_token**: 첫 주문 때 발급하는 `qp_guest` httpOnly 쿠키. "내 주문 기록"을 휴대폰별로 묶는다.
  - 결제 전 취소(pending)는 행을 완전히 삭제한다.
- **order_items**: id, order_id, menu_id, name, price, quantity — 이름·가격은 주문 시점 스냅샷
- **roulette_spins**: id, user_id, store_id, prize_kind, prize_menu_id, redeemed_at, spun_at

매출·페어링 집계는 `status IN ('paid','served')` 기준 (점주가 완료 처리해도 매출에 남아야 함).

---

## 권한·신뢰 경계 (`lib/authz.ts`)

- **점주 전용** (통계·주문 목록·주문 상태 변경·메뉴 CRUD·품절·사진 업로드): 로그인 + `owner_user_id` 일치.
  메뉴 단건 조작은 그 메뉴가 해당 매장 것인지까지 확인.
- **주문 결제/취소**: 테이블 번호 또는 본인 세션 일치.
- **유저 id** (`resolveUserId`): 세션 id만 신뢰. `?userId=` 데모 값은 개발 환경에서만 받는다.
- **주문 생성**: 가격 서버 재계산, 품절 메뉴 차단, 0원 무료증정은 `roulette_spins` 기록과 대조.

---

## 주요 동작 메모

- **추천** (`lib/recommend.ts`): 최근 30일 로그 → 태그별 가중치(주문 2, 조회 1) → 상위 3태그와 겹치는 메뉴 우선,
  동점은 인기순. 로그 없으면 인기순(콜드 스타트). 음료·주류는 인기순 집계 제외.
- **점주 대시보드 폴링**: 주문 5초마다, 통계는 주문 상태가 바뀔 때 즉시 + 평소 30초마다.
  탭이 백그라운드여도 계속 폴링(알림 때문).
- **새 주문 알림** (대시보드): 기본 켜짐, 켜짐/꺼짐은 localStorage 기억, 켜고 끌 때 무음.
  열자마자 AudioContext를 만들어 둔다. 브라우저가 자동 재생을 막으면 새 주문 때마다 resume을 다시 시도하고,
  화면을 한 번 누르면 풀린다 (안내 문구는 사용자 요청으로 뺐다). 엣지 "미디어 자동 재생: 허용"이면 클릭 없이 울림.
  소리는 Web Audio 합성 종소리 "띵동" — 미(659Hz)→0.3초 뒤 도(523Hz), 배음 ×1·×4·×16, 0.95초에 함께 끊김.
  이어서 speechSynthesis로 "새 주문이 들어왔습니다"(여러 건이면 "새 주문 N건…"). 음성은 브라우저 기본 한국어.
  사용자가 특정 음성 우선 선택은 원치 않아 되돌렸다.
- **손님 알림**: 점주가 완료/거절하면 메뉴판 상단·주문 상태 화면에 알림 + `navigator.vibrate(700)`
  (안드로이드만, iOS는 웹 진동 미지원). 열어둔 동안 대기→처리됨으로 바뀐 순간에만 진동.
- **장바구니 토스트**: "[메뉴명]이/가 담겼습니다" (`lib/josa.ts` 로 받침 판별), 헤더 아래 표시.
- **품절**: 메뉴 관리 목록의 [품절]/[품절 해제] 버튼(PATCH). 손님 메뉴판에서 흐리게 + 담기 불가,
  페어링·룰렛 후보에서도 제외.

---

## 로컬 실행

```bash
npm install
DB_DRIVER=sqlite npm run dev     # 배포 DB 대신 로컬 qr-place.db (없으면 자동 생성)
```

- 손님 메뉴판: http://localhost:3000/stores/1?table=A1 (개인화 데모: `&userId=1`)
- 점주: http://localhost:3000/dashboard (카카오 로그인 → 매장 등록한 계정만 대시보드 접근)
- 검사: `npm run lint` / `npm test` / `npx tsc --noEmit` / `npm run build`
- 로컬 DB 초기화: `npm run db:reset`

## 테스트 데이터 정리 (배포 DB, Neon SQL Editor에서 한 줄씩)

```sql
DELETE FROM orders WHERE store_id = 1 AND created_at >= 'YYYY-MM-DD 00:00:00+09';
DELETE FROM view_logs WHERE store_id = 1 AND created_at >= 'YYYY-MM-DD 00:00:00+09';
DELETE FROM roulette_spins WHERE store_id = 1 AND spun_at >= 'YYYY-MM-DD 00:00:00+09';
```

배포 매장 1번(가마치통닭 구리인창점)의 9/13·9/14 주문은 대시보드 차트용으로 남겨 둔 데이터다.

---

## 남은 과제 (선택)

- API 라우트 통합 테스트 확대 — 지금은 주문 생성 라우트와 권한 가드 위주
- 비로그인 손님 익명 개인화 (지금은 로그인해야 개인화)
- Postgres 주문 저장 쿼리 묶기 (주문 항목을 한 번에 INSERT) — 로컬 검증 불가라 보류
- 같은 매장에서 두 결제가 동시에 오면 daily_no가 겹칠 수 있음 — 필요 시 유니크 인덱스 + 재시도
