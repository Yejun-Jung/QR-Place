# 카카오맵 연동 — "내 맛집 지도" — 디자인 문서

**날짜:** 2026-09-03
**배경:** CLAUDE.md 5주차 목표. 로그인한 손님이 지금까지 방문/주문한 매장들을 지도에서 한눈에 보는 기능. `stores` 테이블에는 이미 카카오 로컬 API로 채운 `latitude`/`longitude`가 있고, `view_logs`에는 로그인 유저의 조회/주문 기록이 쌓이고 있어 — 새 데이터 수집 없이 기존 데이터를 지도로 보여주기만 하면 된다.

## 범위

1. 손님용 신규 페이지 `/stores/map` — 로그인 유저가 방문/주문한 매장을 카카오맵 위 핀으로 표시
2. 기존 메뉴판(`/stores/[storeId]`)에 이 페이지로 가는 진입 링크 추가
3. 비로그인 접근 시 로그인 유도 화면

## 범위 밖

- 매장 검색/필터/즐겨찾기 (지금은 "내가 다녀온 곳"만)
- 점주용 지도(대시보드 쪽) — 이번 스펙은 손님 화면 전용
- 방문 기록이 없는 매장을 지도에서 미리보기 (등록된 전체 매장 노출 X — 로그인 유저의 `view_logs` 기준으로만 필터)
- 룰렛/추천과의 연동 (지도는 순수 열람 기능)

## 기술 선택

**`react-kakao-maps-sdk`** — 카카오맵 JS SDK를 React 컴포넌트로 감싼 라이브러리. `NEXT_PUBLIC_KAKAO_MAP_KEY`(카카오 "지도" 앱의 JavaScript 키, 이미 `.env.local`에 설정됨)로 SDK를 로드한다.

이 키는 브라우저에 그대로 노출되는 게 정상이다 (`NEXT_PUBLIC_` 접두사가 그 의미) — 카카오맵 JS 키는 REST API 키와 달리 도메인 화이트리스트로 보호되는 구조.

## 데이터 흐름

방문 매장 조회는 새 DB 함수 하나로 처리:

```sql
SELECT DISTINCT s.*
FROM stores s
JOIN view_logs v ON v.store_id = s.id
WHERE v.user_id = ?
```

`DbAdapter`에 추가:

```ts
getVisitedStoresByUser(userId: number): Promise<Store[]>;
```

`lib/db.sqlite.ts`, `lib/db.postgres.ts` 양쪽에 구현 (기존 `getStoreByOwner`와 같은 패턴 — 단일 쿼리, 파라미터 바인딩).

새 API 라우트 `app/api/stores/visited/route.ts` (GET):
- `auth()`로 세션 확인, 없으면 401
- 있으면 `getVisitedStoresByUser(session.user.id)` 호출 후 `{ stores: Store[] }` 반환

## 페이지: `app/stores/map/page.tsx`

`app/stores/layout.tsx`의 `.app` 460px 셸을 그대로 씀 (경로가 `/stores/*` 아래라 자동 적용).

**비로그인 (`useSession()` → `status !== "authenticated"`):**
- 안내 문구 + "카카오로 로그인" 버튼(`signIn("kakao", { redirectTo: "/stores/map" })`) — 기존 메뉴판 로그인 배너와 같은 톤

**로그인, 방문 기록 0건:**
- 빈 상태 화면: "아직 다녀온 맛집이 없어요 — 매장에서 메뉴를 둘러보면 여기에 표시돼요"

**로그인, 방문 기록 있음:**
- `<Map>` 컴포넌트(react-kakao-maps-sdk)에 매장 개수만큼 `<MapMarker>` 렌더
- 초기 중심: 매장 좌표들의 평균 (매장 1개면 그 좌표)
- 매장이 2개 이상이면 SDK의 bounds 기능으로 모든 핀이 보이도록 자동 줌 조정
- 핀 클릭 → 매장명 + "메뉴 보기" 링크가 담긴 커스텀 오버레이(`<CustomOverlayMap>`) 표시, 링크는 `/stores/{storeId}`로 이동 (테이블 번호 없이 — 지도에서 들어가는 건 QR 스캔이 아니므로 주문 불가, 열람 전용이라는 걸 화면에 안내 문구로 표시)

## 좌표 평균/bounds 계산 — 순수 함수로 분리

`lib/mapView.ts` (신규):

```ts
export function averageCenter(stores: { latitude: number; longitude: number }[]): { lat: number; lng: number } | null
```

- 빈 배열이면 `null` (호출부에서 빈 상태 처리)
- `latitude`/`longitude`가 `null`인 매장(좌표 없이 등록된 예외 케이스)은 평균 계산에서 제외
- 제외 후에도 매장이 남아있으면 그 평균, 하나도 안 남으면 `null`

bounds(줌 맞추기) 자체는 SDK가 제공하는 `kakao.maps.LatLngBounds`를 페이지 컴포넌트에서 직접 쓰고, `averageCenter`만 유닛 테스트 대상 순수 함수로 둔다 (기존 `lib/qr.ts`, `lib/kakao.ts` 패턴과 동일하게 "순수 계산은 분리해서 테스트, SDK 호출부는 얇게 유지").

## 진입 링크: `app/stores/[storeId]/page.tsx` 수정

로그인 배너 자리(`session?.user` 분기)에 링크 추가:

```tsx
{session?.user && (
  <p className="muted" style={{ margin: "8px 16px 0" }}>
    {session.user.nickname ?? session.user.name ?? "회원"}님, 안녕하세요 ·{" "}
    <Link href="/stores/map">🗺️ 내 맛집 지도</Link>
  </p>
)}
```

비로그인 배너는 그대로 둔다 (거기서 로그인하면 다음에 이 링크가 보임 — 별도 안내 불필요).

## 의존성 추가

`react-kakao-maps-sdk`

## 환경 변수 (이미 설정됨)

```
NEXT_PUBLIC_KAKAO_MAP_KEY=...   # 지도 앱의 JavaScript 키
```

## 테스트 / 검증 방법

- `lib/mapView.ts`의 `averageCenter`는 순수 함수라 유닛 테스트 (`lib/__tests__/mapView.test.ts`): 빈 배열, 좌표 1개, 좌표 여러개, `null` 좌표 섞인 경우
- `getVisitedStoresByUser`는 기존 관례(`getStoreByOwner`와 동일)대로 실제 DB로 브라우저에서 직접 검증
- 브라우저 E2E: 로그인 계정으로 매장 메뉴 조회(view_log 적재) → "내 맛집 지도" 진입 → 핀 표시 확인 → 핀 클릭 → 메뉴판 이동 확인 → 비로그인 상태로 `/stores/map` 직접 접근 시 로그인 유도 화면 확인
- `npx vitest run` + `npx tsc --noEmit`
