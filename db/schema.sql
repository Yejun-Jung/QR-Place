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
  longitude      DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS menus (
  id          SERIAL PRIMARY KEY,
  store_id    INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        VARCHAR NOT NULL,
  price       INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  tags        JSONB NOT NULL DEFAULT '{}'::jsonb
  -- 예: {"category": "찌개", "spicy": 3, "price_range": "mid"}
);

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
  status         VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  payment_method VARCHAR CHECK (payment_method IN ('card','kakaopay','counter')),
  total_amount   INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at        TIMESTAMPTZ
);

-- 주문 항목 (주문 시점 이름/가격 스냅샷)
CREATE TABLE IF NOT EXISTS order_items (
  id       SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_id  INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name     VARCHAR NOT NULL,
  price    INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_view_logs_user  ON view_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_logs_store ON view_logs (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_logs_menu  ON view_logs (menu_id, action_type);
CREATE INDEX IF NOT EXISTS idx_menus_store     ON menus (store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store    ON orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_ord ON order_items (order_id);
