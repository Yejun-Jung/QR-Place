# 카카오 로그인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NextAuth v5 + 카카오 Provider로 실제 로그인을 붙이고, 손님 개인화와 점주 매장 소유권을 실제 계정에 연결한다.

**Architecture:** JWT 세션 전략(별도 어댑터 DB 테이블 없음) — 로그인 콜백에서 카카오 프로필을 우리 `users` 테이블에 upsert하고, 그 내부 정수 id를 세션에 심는다. `stores.owner_user_id`로 점주-매장을 연결하고, `/dashboard` 진입 라우터가 로그인 상태+소유 매장 유무에 따라 분기한다.

**Tech Stack:** next-auth v5(beta), Next.js 15 App Router (Server Actions로 로그인 트리거)

**Spec:** [docs/superpowers/specs/2026-09-02-kakao-login-design.md](../specs/2026-09-02-kakao-login-design.md)

## Global Constraints

- 손님용 메뉴판은 로그인 게이트를 넣지 않는다 — QR 스캔 → 바로 메뉴, 배너로만 로그인 유도 (스펙: 손님 플로우).
- 1계정 = 매장 0~1개로 단순화한다. `getStoreByOwner`는 단일 `Store | null`을 반환한다 (스펙: 범위 밖).
- `/dashboard/[storeId]/*` 직접 URL 접근 제어는 이번 범위에 넣지 않는다 (스펙: 범위 밖).
- NextAuth 전용 어댑터 테이블(`accounts`/`sessions`/`verification_tokens`)은 만들지 않는다 — JWT 세션만 쓴다 (스펙: 기술 선택).
- 카카오 로그인은 "QR-Place" 앱의 `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`을 쓰고, 로컬 장소검색은 기존대로 "지도" 앱의 `KAKAO_REST_API_KEY`를 그대로 쓴다 — 서로 다른 카카오 앱, 헷갈리지 말 것.
- 실제 카카오 계정 비밀번호 입력이 필요한 단계는 어떤 자동화 주체(에이전트/서브에이전트)도 대신 수행하지 않는다 — 사용자가 직접 완료한다 (안전 정책).

---

### Task 1: DB 계층 — `owner_user_id` + 유저 upsert + `getStoreByOwner`

**Files:**
- Modify: `lib/types.ts`
- Modify: `db/schema.sql`
- Modify: `lib/db.sqlite.ts`
- Modify: `lib/db.postgres.ts`
- Modify: `lib/db.ts`
- Modify: `app/api/stores/route.ts` (임시 호환: `ownerUserId: null`로 타입만 맞춤 — Task 3에서 실값으로 교체)

**Interfaces:**
- Consumes: 없음
- Produces: `DbAdapter.getOrCreateUserByKakaoId(kakaoId: string, nickname: string | null): Promise<{id:number; kakao_id:string; nickname:string|null}>`, `DbAdapter.getStoreByOwner(ownerUserId: number): Promise<Store|null>`, `Store.owner_user_id: number|null`, `NewStoreInput.ownerUserId: number|null` — Task 2(간접) · Task 3 · Task 4가 이 시그니처를 그대로 쓴다.

- [ ] **Step 1: `lib/types.ts`에 타입 추가**

`Store` 인터페이스 뒤에 `owner_user_id` 필드 추가, `NewStoreInput`에 `ownerUserId` 필드 추가.

Before:
```ts
export interface Store {
  id: number;
  name: string;
  kakao_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** 신규 매장 등록 입력 (카카오 로컬 API 검색 결과에서 채워짐) */
export interface NewStoreInput {
  name: string;
  kakaoPlaceId: string;
  latitude: number;
  longitude: number;
}
```

After:
```ts
export interface Store {
  id: number;
  name: string;
  kakao_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  owner_user_id: number | null;
}

/** 신규 매장 등록 입력 (카카오 로컬 API 검색 결과에서 채워짐) */
export interface NewStoreInput {
  name: string;
  kakaoPlaceId: string;
  latitude: number;
  longitude: number;
  ownerUserId: number | null;
}

/** 카카오 로그인으로 만들어지는 내부 유저 레코드 */
export interface User {
  id: number;
  kakao_id: string;
  nickname: string | null;
}
```

- [ ] **Step 2: `db/schema.sql`에 컬럼 추가 (Postgres)**

`stores` 테이블 정의 뒤에 owner_user_id 컬럼을 추가하고, 이미 배포된 DB에도 안전하게 적용되도록 `ADD COLUMN IF NOT EXISTS`도 같이 둔다.

Before:
```sql
CREATE TABLE IF NOT EXISTS stores (
  id             SERIAL PRIMARY KEY,
  kakao_place_id VARCHAR,
  name           VARCHAR NOT NULL,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION
);
```

After:
```sql
CREATE TABLE IF NOT EXISTS stores (
  id             SERIAL PRIMARY KEY,
  kakao_place_id VARCHAR,
  name           VARCHAR NOT NULL,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  owner_user_id  INTEGER REFERENCES users(id)
);

ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id);
```

- [ ] **Step 3: `lib/db.sqlite.ts` — 스키마에 컬럼 추가 + 기존 DB 마이그레이션**

`stores` CREATE TABLE에 컬럼 추가:

Before:
```ts
CREATE TABLE IF NOT EXISTS stores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  kakao_place_id TEXT,
  name           TEXT NOT NULL,
  latitude       REAL,
  longitude      REAL
);
```

After:
```ts
CREATE TABLE IF NOT EXISTS stores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  kakao_place_id TEXT,
  name           TEXT NOT NULL,
  latitude       REAL,
  longitude      REAL,
  owner_user_id  INTEGER REFERENCES users(id)
);
```

`db()` 함수에 기존 로컬 DB 파일(컬럼 추가 전에 이미 생성된 `qr-place.db`)도 자동으로 업그레이드되도록 마이그레이션을 넣는다.

Before:
```ts
function db(): DatabaseSync {
  if (_db) return _db;
  const d = new DatabaseSync(DB_PATH);
  d.exec("PRAGMA journal_mode = WAL;");
  d.exec("PRAGMA foreign_keys = ON;");
  d.exec(SCHEMA);
  const seeded = d
    .prepare("SELECT COUNT(*) AS n FROM stores")
    .get() as { n: number } | undefined;
  if (!seeded || seeded.n === 0) d.exec(SEED);
  _db = d;
  return d;
}
```

After:
```ts
function db(): DatabaseSync {
  if (_db) return _db;
  const d = new DatabaseSync(DB_PATH);
  d.exec("PRAGMA journal_mode = WAL;");
  d.exec("PRAGMA foreign_keys = ON;");
  d.exec(SCHEMA);
  const storeCols = d.prepare("PRAGMA table_info(stores)").all() as {
    name: string;
  }[];
  if (!storeCols.some((c) => c.name === "owner_user_id")) {
    d.exec("ALTER TABLE stores ADD COLUMN owner_user_id INTEGER REFERENCES users(id)");
  }
  const seeded = d
    .prepare("SELECT COUNT(*) AS n FROM stores")
    .get() as { n: number } | undefined;
  if (!seeded || seeded.n === 0) d.exec(SEED);
  _db = d;
  return d;
}
```

- [ ] **Step 4: `lib/db.sqlite.ts` — `getStore`/`createStore` 수정 + `getOrCreateUserByKakaoId`/`getStoreByOwner` 추가**

Before:
```ts
export const sqliteAdapter: DbAdapter = {
  async getStore(storeId) {
    return (
      queryOne<Store | undefined>(
        "SELECT id, name, kakao_place_id, latitude, longitude FROM stores WHERE id = ?",
        storeId,
      ) ?? null
    );
  },

  async createStore(input) {
    const row = queryOne<{ id: number }>(
      `INSERT INTO stores (kakao_place_id, name, latitude, longitude)
       VALUES (?, ?, ?, ?) RETURNING id`,
      input.kakaoPlaceId,
      input.name,
      input.latitude,
      input.longitude,
    );
    return {
      id: Number(row.id),
      name: input.name,
      kakao_place_id: input.kakaoPlaceId,
      latitude: input.latitude,
      longitude: input.longitude,
    } satisfies Store;
  },
```

After:
```ts
export const sqliteAdapter: DbAdapter = {
  async getStore(storeId) {
    return (
      queryOne<Store | undefined>(
        "SELECT id, name, kakao_place_id, latitude, longitude, owner_user_id FROM stores WHERE id = ?",
        storeId,
      ) ?? null
    );
  },

  async createStore(input) {
    const row = queryOne<{ id: number }>(
      `INSERT INTO stores (kakao_place_id, name, latitude, longitude, owner_user_id)
       VALUES (?, ?, ?, ?, ?) RETURNING id`,
      input.kakaoPlaceId,
      input.name,
      input.latitude,
      input.longitude,
      input.ownerUserId,
    );
    return {
      id: Number(row.id),
      name: input.name,
      kakao_place_id: input.kakaoPlaceId,
      latitude: input.latitude,
      longitude: input.longitude,
      owner_user_id: input.ownerUserId,
    } satisfies Store;
  },

  async getOrCreateUserByKakaoId(kakaoId, nickname) {
    const existing = queryOne<
      { id: number; kakao_id: string; nickname: string | null } | undefined
    >("SELECT id, kakao_id, nickname FROM users WHERE kakao_id = ?", kakaoId);
    if (existing) return existing;
    const row = queryOne<{ id: number }>(
      "INSERT INTO users (kakao_id, nickname) VALUES (?, ?) RETURNING id",
      kakaoId,
      nickname,
    );
    return { id: Number(row.id), kakao_id: kakaoId, nickname };
  },

  async getStoreByOwner(ownerUserId) {
    return (
      queryOne<Store | undefined>(
        "SELECT id, name, kakao_place_id, latitude, longitude, owner_user_id FROM stores WHERE owner_user_id = ?",
        ownerUserId,
      ) ?? null
    );
  },
```

- [ ] **Step 5: `lib/db.postgres.ts` — 동일한 변경**

Before:
```ts
export const postgresAdapter: DbAdapter = {
  async getStore(storeId) {
    const { rows } = await sql<Store>`
      SELECT id, name, kakao_place_id, latitude, longitude
      FROM stores WHERE id = ${storeId}
    `;
    return rows[0] ?? null;
  },

  async createStore(input) {
    const { rows } = await sql<Store>`
      INSERT INTO stores (kakao_place_id, name, latitude, longitude)
      VALUES (${input.kakaoPlaceId}, ${input.name}, ${input.latitude}, ${input.longitude})
      RETURNING id, name, kakao_place_id, latitude, longitude
    `;
    return rows[0];
  },
```

After:
```ts
export const postgresAdapter: DbAdapter = {
  async getStore(storeId) {
    const { rows } = await sql<Store>`
      SELECT id, name, kakao_place_id, latitude, longitude, owner_user_id
      FROM stores WHERE id = ${storeId}
    `;
    return rows[0] ?? null;
  },

  async createStore(input) {
    const { rows } = await sql<Store>`
      INSERT INTO stores (kakao_place_id, name, latitude, longitude, owner_user_id)
      VALUES (${input.kakaoPlaceId}, ${input.name}, ${input.latitude}, ${input.longitude}, ${input.ownerUserId})
      RETURNING id, name, kakao_place_id, latitude, longitude, owner_user_id
    `;
    return rows[0];
  },

  async getOrCreateUserByKakaoId(kakaoId, nickname) {
    const { rows: existing } = await sql<{
      id: number;
      kakao_id: string;
      nickname: string | null;
    }>`SELECT id, kakao_id, nickname FROM users WHERE kakao_id = ${kakaoId}`;
    if (existing[0]) return existing[0];
    const { rows } = await sql<{
      id: number;
      kakao_id: string;
      nickname: string | null;
    }>`
      INSERT INTO users (kakao_id, nickname) VALUES (${kakaoId}, ${nickname})
      RETURNING id, kakao_id, nickname
    `;
    return rows[0];
  },

  async getStoreByOwner(ownerUserId) {
    const { rows } = await sql<Store>`
      SELECT id, name, kakao_place_id, latitude, longitude, owner_user_id
      FROM stores WHERE owner_user_id = ${ownerUserId}
    `;
    return rows[0] ?? null;
  },
```

- [ ] **Step 6: `lib/db.ts` — 인터페이스 + wrapper export 추가**

`DbAdapter` 인터페이스에 추가 (import에 `User` 타입도 추가):

Before:
```ts
import type {
  DailyVisitorRow,
  InsertLogInput,
  LogEntry,
  Menu,
  MenuInput,
  NewOrderInput,
  NewStoreInput,
  Order,
  OrderSummaryRow,
  PaymentMethod,
  PopularMenuRow,
  RevenueRow,
  Store,
} from "./types";
```

After:
```ts
import type {
  DailyVisitorRow,
  InsertLogInput,
  LogEntry,
  Menu,
  MenuInput,
  NewOrderInput,
  NewStoreInput,
  Order,
  OrderSummaryRow,
  PaymentMethod,
  PopularMenuRow,
  RevenueRow,
  Store,
  User,
} from "./types";
```

Before:
```ts
export interface DbAdapter {
  getStore(storeId: number): Promise<Store | null>;
  createStore(input: NewStoreInput): Promise<Store>;
```

After:
```ts
export interface DbAdapter {
  getStore(storeId: number): Promise<Store | null>;
  createStore(input: NewStoreInput): Promise<Store>;
  getOrCreateUserByKakaoId(
    kakaoId: string,
    nickname: string | null,
  ): Promise<User>;
  getStoreByOwner(ownerUserId: number): Promise<Store | null>;
```

파일 끝쪽 wrapper export들 옆에 추가 (`createStore` wrapper 바로 아래):

Before:
```ts
export async function createStore(input: NewStoreInput) {
  return (await getAdapter()).createStore(input);
}
```

After:
```ts
export async function createStore(input: NewStoreInput) {
  return (await getAdapter()).createStore(input);
}
export async function getOrCreateUserByKakaoId(
  kakaoId: string,
  nickname: string | null,
) {
  return (await getAdapter()).getOrCreateUserByKakaoId(kakaoId, nickname);
}
export async function getStoreByOwner(ownerUserId: number) {
  return (await getAdapter()).getStoreByOwner(ownerUserId);
}
```

- [ ] **Step 7: `app/api/stores/route.ts` — 타입만 맞추는 임시 수정**

`NewStoreInput`이 이제 `ownerUserId`를 요구하므로, 아직 로그인이 없는 이 시점엔 `null`로 채워서 타입 에러만 없앤다 (Task 3에서 실제 세션 값으로 교체).

Before:
```ts
  const input: NewStoreInput = { name, kakaoPlaceId, latitude, longitude };
```

After:
```ts
  // TODO(Task 3): 로그인 세션의 유저 id로 교체
  const input: NewStoreInput = {
    name,
    kakaoPlaceId,
    latitude,
    longitude,
    ownerUserId: null,
  };
```

- [ ] **Step 8: 타입체크 + 테스트**

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `npx vitest run`
Expected: 13/13 통과 (이 태스크는 로직 변경 없음, 기존 테스트 그대로)

- [ ] **Step 9: 브라우저로 마이그레이션 확인**

기존 `qr-place.db`가 이미 있는 상태에서(리셋하지 않고) `npm run dev` 실행 후 `/dashboard/new`에서 매장을 하나 등록해보고 에러 없이 되는지 확인 (컬럼 추가 마이그레이션이 기존 DB에도 안전하게 적용됐는지 확인하는 목적).

- [ ] **Step 10: 커밋**

```bash
git add lib/types.ts db/schema.sql lib/db.sqlite.ts lib/db.postgres.ts lib/db.ts app/api/stores/route.ts
git commit -m "feat: stores.owner_user_id + 유저 upsert DB 계층 추가"
```

---

### Task 2: NextAuth 핵심 설정 (카카오 Provider, 세션)

**Files:**
- Modify: `package.json` (next-auth 설치)
- Create: `auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `types/next-auth.d.ts`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `getOrCreateUserByKakaoId` (Task 1, `lib/db.ts`)
- Produces: `auth()`, `signIn()`, `signOut()`, `handlers` (모두 `@/auth`에서) — Task 3·4·5가 그대로 임포트해서 쓴다. 세션 모양: `session.user.id: number`, `session.user.nickname: string | null`.

- [ ] **Step 1: next-auth 설치**

Run: `npm install next-auth@beta`

- [ ] **Step 2: `types/next-auth.d.ts` 작성 (세션 타입 확장)**

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      nickname: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    nickname?: string | null;
  }
}
```

- [ ] **Step 3: `auth.ts` 작성 (프로젝트 루트)**

카카오 프로필 응답은 API 버전에 따라 닉네임 위치가 달라질 수 있어(`kakao_account.profile.nickname` 또는 `properties.nickname`) 둘 다 방어적으로 시도한다.

```ts
import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { getOrCreateUserByKakaoId } from "@/lib/db";

interface KakaoProfile {
  id: number;
  kakao_account?: { profile?: { nickname?: string } };
  properties?: { nickname?: string };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const kakaoProfile = profile as unknown as KakaoProfile;
        const kakaoId = String(kakaoProfile.id);
        const nickname =
          kakaoProfile.kakao_account?.profile?.nickname ??
          kakaoProfile.properties?.nickname ??
          null;
        const user = await getOrCreateUserByKakaoId(kakaoId, nickname);
        token.userId = user.id;
        token.nickname = user.nickname;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId != null) {
        session.user.id = token.userId;
        session.user.nickname = token.nickname ?? null;
      }
      return session;
    },
  },
});
```

- [ ] **Step 4: `app/api/auth/[...nextauth]/route.ts` 작성**

```ts
import { handlers } from "@/auth";

export const runtime = "nodejs";
export const { GET, POST } = handlers;
```

- [ ] **Step 5: `app/layout.tsx` — `SessionProvider`로 감싸기**

Before:
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
      <body>{children}</body>
    </html>
  );
}
```

After:
```tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_KR } from "next/font/google";
import { SessionProvider } from "next-auth/react";
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
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (`next-auth@beta` 설치 후에도 `KAKAO_CLIENT_ID`/`SECRET`이 `string | undefined` 타입이라 Kakao provider 옵션 타입과 맞는지 확인 — 안 맞으면 `process.env.KAKAO_CLIENT_ID!` 처럼 non-null assertion 추가)

- [ ] **Step 7: 브라우저로 설정 확인 (실제 로그인 없이)**

`npm run dev` 후 `http://localhost:3000/api/auth/providers` 접속 — JSON 응답에 `kakao` provider가 나열되는지 확인 (여기까진 실제 로그인 없이 설정만 확인하는 것).

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json auth.ts "app/api/auth/[...nextauth]/route.ts" types/next-auth.d.ts app/layout.tsx
git commit -m "feat: NextAuth v5 + 카카오 Provider 설정"
```

---

### Task 3: 매장 등록에 로그인 세션 연결

**Files:**
- Modify: `app/api/stores/route.ts`

**Interfaces:**
- Consumes: `auth()` (Task 2, `@/auth`)
- Produces: 없음 (터미널 라우트)

- [ ] **Step 1: 세션에서 `ownerUserId` 가져오도록 교체**

Before:
```ts
import { NextRequest, NextResponse } from "next/server";
import { createStore } from "@/lib/db";
import type { NewStoreInput } from "@/lib/types";
```

After:
```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createStore } from "@/lib/db";
import type { NewStoreInput } from "@/lib/types";
```

Before:
```ts
  // TODO(Task 3): 로그인 세션의 유저 id로 교체
  const input: NewStoreInput = {
    name,
    kakaoPlaceId,
    latitude,
    longitude,
    ownerUserId: null,
  };
```

After:
```ts
  const session = await auth();
  const input: NewStoreInput = {
    name,
    kakaoPlaceId,
    latitude,
    longitude,
    ownerUserId: session?.user?.id ?? null,
  };
```

(클라이언트가 `ownerUserId`를 body로 보내게 하지 않는다 — 서버가 세션에서 직접 읽어야 다른 사람 id를 사칭해 매장을 자기 것으로 등록하는 걸 막을 수 있다.)

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app/api/stores/route.ts
git commit -m "feat: 매장 등록 시 로그인 세션의 유저를 owner로 연결"
```

---

### Task 4: 점주 진입 라우터 (`/dashboard`) + 홈 링크

**Files:**
- Create: `app/dashboard/page.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `auth()`, `signIn()` (Task 2), `getStoreByOwner()` (Task 1)
- Produces: 없음 (터미널 페이지)

- [ ] **Step 1: `app/dashboard/page.tsx` 작성**

`app/dashboard/layout.tsx`(기존, PC 900px 셸)가 자동으로 이 페이지를 감싼다.

```tsx
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import AppHeader from "@/app/ui/AppHeader";
import { getStoreByOwner } from "@/lib/db";

export default async function DashboardEntryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <>
        <AppHeader title="점주 로그인" back={false} />
        <div className="section">
          <p className="muted" style={{ marginTop: 0 }}>
            카카오 계정으로 로그인하면 내 매장 대시보드로 이동합니다.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("kakao", { redirectTo: "/dashboard" });
            }}
          >
            <button className="btn" type="submit">
              카카오로 로그인
            </button>
          </form>
        </div>
      </>
    );
  }

  const store = await getStoreByOwner(session.user.id);
  redirect(store ? `/dashboard/${store.id}` : "/dashboard/new");
}
```

- [ ] **Step 2: `app/page.tsx` — 홈에 진짜 로그인 링크 추가**

"점주 화면" 목록 맨 앞에 추가 (기존 데모 링크들은 유지).

Before:
```tsx
        <h2 className="section-title" style={{ margin: "18px 0 8px" }}>
          점주 화면
        </h2>
        <ul className="plain" style={{ padding: 0 }}>
          <li>
            <Link href="/dashboard/1">📊 대시보드 — 매출·방문자·주문·인기메뉴</Link>
          </li>
          <li>
            <Link href="/dashboard/new">🏪 신규 매장 등록 (카카오 장소 검색)</Link>
          </li>
        </ul>
```

After:
```tsx
        <h2 className="section-title" style={{ margin: "18px 0 8px" }}>
          점주 화면
        </h2>
        <ul className="plain" style={{ padding: 0 }}>
          <li>
            <Link href="/dashboard">🔑 점주 로그인</Link>
          </li>
          <li>
            <Link href="/dashboard/1">📊 대시보드 — 매출·방문자·주문·인기메뉴</Link>
          </li>
          <li>
            <Link href="/dashboard/new">🏪 신규 매장 등록 (카카오 장소 검색)</Link>
          </li>
        </ul>
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 브라우저로 로그아웃 상태 확인**

`/dashboard` 접속 → "카카오로 로그인" 버튼만 있는 화면이 뜨는지 확인 (아직 로그인 완료까지는 안 함 — 그건 Task 6에서 사용자가 직접 확인).

- [ ] **Step 5: 커밋**

```bash
git add app/dashboard/page.tsx app/page.tsx
git commit -m "feat: 점주 진입 라우터(/dashboard) — 로그인/소유 매장 분기"
```

---

### Task 5: 손님 메뉴판 — 로그인 배너 + 세션 기반 개인화

**Files:**
- Modify: `app/stores/[storeId]/page.tsx`

**Interfaces:**
- Consumes: `useSession()`, `signIn()` from `next-auth/react` (Task 2)
- Produces: 없음 (터미널 페이지)

- [ ] **Step 1: `useSession` 도입 + `effectiveUserId` 계산**

Before:
```tsx
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCart, won } from "@/lib/useCart";
import type { RankedMenu, Store } from "@/lib/types";
```

After:
```tsx
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useCart, won } from "@/lib/useCart";
import type { RankedMenu, Store } from "@/lib/types";
```

Before:
```tsx
function MenuBoard() {
  const { storeId } = useParams<{ storeId: string }>();
  const search = useSearchParams();
  const userId = search.get("userId");
  const table = search.get("table");

  const cart = useCart(storeId, table);
```

After:
```tsx
function MenuBoard() {
  const { storeId } = useParams<{ storeId: string }>();
  const search = useSearchParams();
  const userId = search.get("userId");
  const table = search.get("table");
  const { data: session } = useSession();
  // 로그인했으면 실제 세션 유저를 쓰고, 아니면 데모용 ?userId= 쿼리파라미터를 그대로 지원
  const effectiveUserId = session?.user?.id
    ? String(session.user.id)
    : userId;

  const cart = useCart(storeId, table);
```

- [ ] **Step 2: `logView`/메뉴 fetch가 `effectiveUserId`를 쓰도록 교체**

Before:
```tsx
  const logView = useCallback(
    (menuId: number) => {
      void fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          storeId: Number(storeId),
          menuId,
          tableNumber: table,
          actionType: "view",
        }),
      });
    },
    [userId, storeId, table],
  );

  useEffect(() => {
    const qs = new URLSearchParams();
    if (userId) qs.set("userId", userId);
    fetch(`/api/stores/${storeId}/menus?${qs.toString()}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then(setData)
      .catch((e) => setError(`메뉴를 불러오지 못했습니다 (${e.message})`));
  }, [storeId, userId]);
```

After:
```tsx
  const logView = useCallback(
    (menuId: number) => {
      void fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          storeId: Number(storeId),
          menuId,
          tableNumber: table,
          actionType: "view",
        }),
      });
    },
    [effectiveUserId, storeId, table],
  );

  useEffect(() => {
    const qs = new URLSearchParams();
    if (effectiveUserId) qs.set("userId", effectiveUserId);
    fetch(`/api/stores/${storeId}/menus?${qs.toString()}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then(setData)
      .catch((e) => setError(`메뉴를 불러오지 못했습니다 (${e.message})`));
  }, [storeId, effectiveUserId]);
```

(`nextQs`는 그대로 둔다 — 이건 `table`/`userId` 쿼리파라미터를 페이지 이동 간 유지하는 용도라 세션과는 무관하다.)

- [ ] **Step 3: 헤더 아래에 로그인 배너 / 닉네임 표시 추가**

`.blurb` 클래스를 그대로 재사용한다 (신규 CSS 없음).

Before:
```tsx
      <header className="app-header">
        <h1>{data.store.name}</h1>
        <span className="sub">
          테이블 {table ?? "-"} ·{" "}
          {data.personalized ? "맞춤 추천" : "인기순"}
        </span>
      </header>

      {data.blurb && <div className="blurb">💡 {data.blurb}</div>}
```

After:
```tsx
      <header className="app-header">
        <h1>{data.store.name}</h1>
        <span className="sub">
          테이블 {table ?? "-"} ·{" "}
          {data.personalized ? "맞춤 추천" : "인기순"}
        </span>
      </header>

      {!session?.user && (
        <div
          className="blurb"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>카카오로 로그인하고 맞춤 추천 받아보세요</span>
          <button
            className="btn ghost"
            style={{ width: "auto", flexShrink: 0, padding: "6px 14px" }}
            onClick={() => signIn("kakao")}
          >
            로그인
          </button>
        </div>
      )}
      {session?.user && (
        <p className="muted" style={{ margin: "8px 16px 0" }}>
          {session.user.nickname ?? session.user.name ?? "회원"}님, 안녕하세요
        </p>
      )}

      {data.blurb && <div className="blurb">💡 {data.blurb}</div>}
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 5: 브라우저로 비로그인 상태 확인**

`/stores/1?table=A1` 접속 → 로그인 배너가 뜨는지, 기존 `?userId=1` 데모 링크(`/stores/1?table=A1&userId=1`)는 여전히 개인화가 동작하는지(로그인 안 한 상태이므로 `effectiveUserId`가 쿼리파라미터 값으로 fallback) 확인.

- [ ] **Step 6: 커밋**

```bash
git add "app/stores/[storeId]/page.tsx"
git commit -m "feat: 손님 메뉴판에 로그인 배너 + 세션 기반 개인화"
```

---

### Task 6: 전체 회귀 + 실제 로그인 검증

**Files:**
- 없음 (코드 변경 없이 검증만 — 문제 발견 시에만 해당 파일 조정)

**Interfaces:**
- Consumes: Task 1-5의 모든 결과물
- Produces: 없음

- [ ] **Step 1: 자동 테스트**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 13/13 통과, 타입 에러 없음

- [ ] **Step 2: 자동으로 확인 가능한 것들**

- `http://localhost:3000/api/auth/providers` → `kakao` provider 나열 확인
- `/dashboard` (로그아웃 상태) → "카카오로 로그인" 버튼만 있고 크래시 없는지
- `/stores/1?table=A1` (로그아웃 상태) → 로그인 배너 뜨는지, 콘솔 에러 없는지
- `/dashboard/new`에서 매장 하나 등록 → DB에서 그 매장의 `owner_user_id`가 `null`인지 확인 (로그인 안 한 상태로 등록했으므로 — 회귀 없음 확인용)

- [ ] **Step 3: 실제 카카오 로그인 완료 — 이 스텝은 자동화 주체가 대신 할 수 없음**

카카오 비밀번호 입력이 필요한 단계라 에이전트/서브에이전트가 대신 수행하지 않는다. **사용자가 직접** 아래를 확인하고 결과를 알려준다:

1. `/dashboard` 접속 → "카카오로 로그인" 클릭 → 실제 카카오 계정으로 로그인 완료
2. (해당 계정으로 처음이면) `/dashboard/new`로 리다이렉트되는지 → 매장 하나 검색/등록
3. 다시 `/dashboard` 접속 → 이번엔 방금 등록한 매장의 대시보드로 바로 리다이렉트되는지
4. `/stores/{그 매장 id}?table=A1` 접속 → 로그인 배너 대신 닉네임이 뜨는지
5. 메뉴 몇 개 눌러보고 새로고침 → 개인화 추천(`맞춤 추천`)이 실제로 반영되는지

- [ ] **Step 4: 문제 발견 시 수정**

Step 2~3에서 문제가 없으면 이 스텝은 건너뛴다. 문제가 있으면 해당 태스크로 돌아가 수정 후 다시 확인한다.

- [ ] **Step 5: 최종 커밋 (조정 사항이 있었던 경우만)**

```bash
git add -A
git commit -m "fix: 카카오 로그인 최종 조정"
```
