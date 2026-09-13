-- QR-Place 스키마 (Vercel Postgres)
-- 스펙의 테이블명 User/Store/Menu/View_Log 는 Postgres 예약어/관례를 피해
-- users / stores / menus / view_logs 로 매핑한다.

CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  kakao_id  VARCHAR UNIQUE,
  nickname  VARCHAR
);

CREATE TABLE IF NOT EXISTS stores (
  id             SERIAL PRIMARY KEY,
  kakao_place_id VARCHAR,
  name           VARCHAR NOT NULL,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  owner_user_id  INTEGER REFERENCES users(id)
);

ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS menus (
  id          SERIAL PRIMARY KEY,
  store_id    INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        VARCHAR NOT NULL,
  price       INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  tags        JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 예: {"category": "찌개", "spicy": 3, "price_range": "mid"}
  image_url   TEXT
);

ALTER TABLE menus ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS view_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- 비로그인 시 NULL
  table_number VARCHAR,
  store_id     INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  menu_id      INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  action_type  VARCHAR NOT NULL CHECK (action_type IN ('view', 'order')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 주문
CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  store_id       INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  table_number   VARCHAR,
  status         VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','served','rejected','cancelled')),
  payment_method VARCHAR CHECK (payment_method IN ('card','kakaopay','counter')),
  total_amount   INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at        TIMESTAMPTZ
);

-- 기존 배포본: 점주 접수(served/rejected) 상태를 허용하도록 제약 갱신
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','paid','served','rejected','cancelled'));

-- 주문 항목 (주문 시점 이름/가격 스냅샷)
CREATE TABLE IF NOT EXISTS order_items (
  id       SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_id  INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name     VARCHAR NOT NULL,
  price    INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- 룰렛 이벤트: 유저×매장당 하루 1회 제한 확인용 스핀 기록.
-- 당첨 상품은 서버가 뽑아서 여기 남긴다 — 주문 생성 때 "무료 증정" 항목이
-- 진짜 당첨분인지 대조하는 근거이자, 한 번 쓴 당첨을 재사용 못 하게 하는 기록.
CREATE TABLE IF NOT EXISTS roulette_spins (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id      INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  prize_kind    VARCHAR,
  prize_menu_id INTEGER REFERENCES menus(id) ON DELETE SET NULL,
  redeemed_at   TIMESTAMPTZ,
  spun_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE roulette_spins ADD COLUMN IF NOT EXISTS prize_kind VARCHAR;
ALTER TABLE roulette_spins ADD COLUMN IF NOT EXISTS prize_menu_id INTEGER REFERENCES menus(id) ON DELETE SET NULL;
ALTER TABLE roulette_spins ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_view_logs_user  ON view_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_logs_store ON view_logs (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_logs_menu  ON view_logs (menu_id, action_type);
CREATE INDEX IF NOT EXISTS idx_menus_store     ON menus (store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store    ON orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_ord ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_roulette_spins  ON roulette_spins (user_id, store_id, spun_at DESC);
