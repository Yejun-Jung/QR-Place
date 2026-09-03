# 카카오 로그인 (NextAuth v5) — 디자인 문서

**날짜:** 2026-09-02
**배경:** 지금까지 "로그인한 손님"은 `?userId=1` 쿼리파라미터로 흉내만 냈고, 점주 화면은 아예 로그인 없이 누구나 접근 가능했다. 실제 카카오 OAuth를 붙여서 손님 개인화와 점주 매장 소유권을 진짜 계정에 연결한다.

## 범위

1. **카카오 로그인 자체** — NextAuth.js v5 + 카카오 Provider, 세션 동작
2. **손님 개인화 연동** — 메뉴판의 `?userId=` 임시 처리를 실제 로그인 세션으로 교체
3. **점주 진입 라우팅** — 로그인 → 보유 매장 있으면 그 매장 대시보드, 없으면 매장등록 화면

## 범위 밖

- 룰렛 이벤트 로그인 유도 (룰렛 UI 자체가 없음 — 4주차 몫)
- 한 계정이 여러 매장을 소유하는 경우 (1계정 = 매장 0~1개로 단순화)
- `/dashboard/[storeId]/*` 직접 URL 접근에 대한 접근 제어 (로그인 안 해도 URL 알면 여전히 열람 가능 — 지금 상태에서 보안이 후퇴하는 건 아니고, 딱 "진입 라우팅"만 추가하는 범위)
- 로그아웃 버튼의 전역 노출 (일단 `/dashboard` 진입 화면과 손님 메뉴판 배너에만 노출)

## 기술 선택

**NextAuth.js v5 (Auth.js) + 카카오 Provider**, **JWT 세션 전략** (NextAuth 전용 DB 어댑터/세션 테이블 없음 — `users` 테이블은 지금 것 그대로 쓰고, 로그인 콜백에서 upsert).

**카카오 앱 분리:**
- 카카오 로컬 API(장소 검색) → 기존대로 "지도" 앱의 `KAKAO_REST_API_KEY`
- 카카오 로그인 → "QR-Place" 앱의 `KAKAO_CLIENT_ID`(REST API 키) + `KAKAO_CLIENT_SECRET`

## 환경 변수 (이미 `.env.local`에 설정됨)

```
KAKAO_REST_API_KEY=...   # 지도 앱 (로컬 검색용, 기존)
KAKAO_CLIENT_ID=...      # QR-Place 앱 REST API 키 (로그인용, 신규)
KAKAO_CLIENT_SECRET=...  # QR-Place 앱 Client Secret (신규)
AUTH_SECRET=...          # NextAuth 세션 암호화용 랜덤 값 (신규)
```

## 인증 흐름

1. 사용자가 "카카오로 로그인" 클릭 → NextAuth가 카카오 OAuth 페이지로 이동
2. 카카오 인증 완료 → NextAuth가 `app/api/auth/[...nextauth]/route.ts`로 콜백
3. `jwt` 콜백에서 최초 로그인 시(`account` 존재) 카카오 프로필의 `id`(카카오 고유ID)로 우리 `users` 테이블 조회 → 없으면 새로 INSERT → 있으면 그대로. 이 내부 `users.id`(정수)를 JWT에 `userId`로 심음
4. `session` 콜백에서 JWT의 `userId`/`nickname`을 `session.user`에 노출
5. 이후 모든 서버 컴포넌트/라우트 핸들러에서 `auth()` 호출로 `session.user.id`(우리 DB의 정수 id) 획득 가능

**중요:** NextAuth가 자체적으로 만드는 `account`/`session`/`verificationToken` 같은 어댑터 테이블은 전혀 안 만든다 — JWT가 쿠키에 암호화되어 저장되고, 우리 DB엔 `users` 테이블 upsert만 일어난다.

## DB 스키마 변경

`stores` 테이블에 컬럼 추가 (SQLite: `lib/db.sqlite.ts`, Postgres: `db/schema.sql`):

```sql
ALTER TABLE stores ADD COLUMN owner_user_id INTEGER REFERENCES users(id);
```

`createStore` 입력에 `ownerUserId: number | null`을 추가하고, 매장 등록 시 로그인한 유저의 id로 채운다 (로그인 안 한 상태로 등록하면 지금처럼 `null` — 기존 흐름 안 깨짐).

## DbAdapter 확장

```ts
getOrCreateUserByKakaoId(kakaoId: string, nickname: string | null): Promise<{ id: number; kakao_id: string; nickname: string | null }>;
getStoreByOwner(ownerUserId: number): Promise<Store | null>;
```

`createStore`의 `NewStoreInput`에 `ownerUserId: number | null` 필드 추가.

## 라우트 / UI 변경

### 신규: `app/api/auth/[...nextauth]/route.ts`
NextAuth 핸들러 export (`GET`, `POST`).

### 신규: `auth.ts` (프로젝트 루트)
NextAuth 설정 — Kakao Provider, JWT 콜백, 세션 콜백, 타입 확장.

### 신규: `app/dashboard/page.tsx` (점주 진입 라우터)
- 비로그인: "카카오로 로그인" 버튼만 있는 화면
- 로그인 + 보유 매장 있음: 그 매장의 `/dashboard/{storeId}` 로 즉시 리다이렉트
- 로그인 + 보유 매장 없음: `/dashboard/new` 로 즉시 리다이렉트

### 수정: `app/dashboard/new/page.tsx`
등록 시 `ownerUserId`를 세션에서 가져와 함께 전송 (로그인 안 했으면 기존처럼 `null`).

### 수정: `app/stores/[storeId]/page.tsx` (손님 메뉴판)
- 로그인 세션이 있으면 그 `session.user.id`를 개인화에 사용 (기존 `?userId=` 쿼리파라미터는 데모/테스트용으로 계속 지원 — 세션이 없을 때만 fallback)
- 로그인 안 했으면 상단에 배너: "카카오로 로그인하고 맞춤 추천 받기" + 로그인 버튼
- 로그인 했으면 그 자리에 닉네임 표시 (예: "○○님, 안녕하세요")

### 수정: `app/layout.tsx`
`<SessionProvider>`로 감싸서 클라이언트 컴포넌트에서 `useSession()`/`signIn()`/`signOut()` 사용 가능하게 함.

### 수정: `app/page.tsx` (홈)
"점주 화면" 섹션에 "🔑 점주 로그인" 링크(`/dashboard`) 추가 (기존 데모 링크는 유지).

## 의존성 추가

`next-auth` (v5).

## 테스트 / 검증 방법

- `getOrCreateUserByKakaoId`는 순수 DB 로직이라 두 어댑터 각각에 대해 유닛 테스트하기보다, 기존 프로젝트 관례(주문/매장 생성과 동일)대로 실제 DB로 브라우저에서 직접 검증
- 실제 카카오 계정으로 로그인 → 콜백 → `users` 테이블에 row 생성되는지 → 손님 메뉴판 개인화 반영 → 점주 로그인 → 매장 있음/없음 분기 → 등록 후 `owner_user_id` 채워지는지까지 end-to-end 브라우저 검증
- `npx vitest run` + `npx tsc --noEmit` 로 기존 로직 회귀 없는지 확인
