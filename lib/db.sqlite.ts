/**
 * SQLite 어댑터 (데모 기본값).
 *
 * Node 22.5+ 내장 `node:sqlite` 사용 → 추가 설치/네이티브 빌드 없음.
 * 프로젝트 루트의 qr-place.db 파일을 쓰고, 최초 접속 시 스키마+시드를 자동 생성한다.
 * 테스트에서는 SQLITE_PATH=":memory:" 로 격리 가능.
 */
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import type { DbAdapter } from "./db";
import type {
  DailyVisitorRow,
  InsertLogInput,
  LogEntry,
  Menu,
  MenuTags,
  NewOrderInput,
  Order,
  OrderItem,
  OrderSummaryRow,
  PaymentMethod,
  PopularMenuRow,
  RevenueRow,
  Store,
} from "./types";

const DB_PATH = process.env.SQLITE_PATH || join(process.cwd(), "qr-place.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  kakao_id TEXT UNIQUE,
  nickname TEXT
);
CREATE TABLE IF NOT EXISTS stores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  kakao_place_id TEXT,
  name           TEXT NOT NULL,
  latitude       REAL,
  longitude      REAL,
  owner_user_id  INTEGER REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS menus (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id    INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price       INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  tags        TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS view_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  table_number TEXT,
  store_id     INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  menu_id      INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  action_type  TEXT NOT NULL CHECK (action_type IN ('view','order')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id       INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  table_number   TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  payment_method TEXT CHECK (payment_method IN ('card','kakaopay','counter')),
  total_amount   INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at        TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_id  INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  price    INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_view_logs_user  ON view_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_logs_store ON view_logs (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_logs_menu  ON view_logs (menu_id, action_type);
CREATE INDEX IF NOT EXISTS idx_menus_store     ON menus (store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store    ON orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_ord ON order_items (order_id);
`;

const SEED = `
INSERT OR IGNORE INTO users (id, kakao_id, nickname) VALUES
  (1, 'kakao_1', '민준'),
  (2, 'kakao_2', '서연');

INSERT OR IGNORE INTO stores (id, kakao_place_id, name, latitude, longitude) VALUES
  (1, 'place_1', '김가네 한식당', 37.5665, 126.9780);

INSERT OR IGNORE INTO menus (id, store_id, name, price, description, tags) VALUES
  (1, 1, '김치찌개',   9000,  '얼큰한 김치찌개',   '{"category":"찌개","spicy":3,"price_range":"mid"}'),
  (2, 1, '된장찌개',   8000,  '구수한 된장찌개',   '{"category":"찌개","spicy":1,"price_range":"mid"}'),
  (3, 1, '제육볶음',   11000, '매콤한 제육볶음',   '{"category":"볶음","spicy":4,"price_range":"mid"}'),
  (4, 1, '불닭볶음',   12000, '아주 매운 불닭',    '{"category":"볶음","spicy":5,"price_range":"mid"}'),
  (5, 1, '계란말이',   6000,  '부드러운 계란말이', '{"category":"반찬","spicy":0,"price_range":"low"}'),
  (6, 1, '물냉면',     9500,  '시원한 물냉면',     '{"category":"면","spicy":0,"price_range":"mid"}'),
  (7, 1, '갈비탕',     13000, '진한 갈비탕',       '{"category":"탕","spicy":0,"price_range":"high"}'),
  (8, 1, '비빔밥',     9000,  '나물 비빔밥',       '{"category":"밥","spicy":2,"price_range":"mid"}');

INSERT INTO view_logs (user_id, table_number, store_id, menu_id, action_type, created_at) VALUES
  (1,    'A1', 1, 1, 'order', datetime('now', '-2 days')),
  (1,    'A1', 1, 3, 'order', datetime('now', '-2 days')),
  (1,    'A1', 1, 4, 'view',  datetime('now', '-2 days')),
  (1,    'A3', 1, 3, 'view',  datetime('now', '-10 days')),
  (1,    'A3', 1, 1, 'view',  datetime('now', '-10 days')),
  (2,    'B2', 1, 7, 'order', datetime('now', '-1 days')),
  (2,    'B2', 1, 6, 'order', datetime('now', '-1 days')),
  (NULL, 'C1', 1, 1, 'order', datetime('now', '-3 days')),
  (NULL, 'C4', 1, 6, 'order', datetime('now', '-5 days')),
  (NULL, 'C4', 1, 8, 'view',  datetime('now', '-5 days')),
  (NULL, 'C7', 1, 1, 'order', datetime('now', '-6 days'));

INSERT OR IGNORE INTO orders (id, store_id, user_id, table_number, status, payment_method, total_amount, created_at, paid_at) VALUES
  (1, 1, 1,    'A1', 'paid', 'card',     20000, datetime('now', '-2 days'), datetime('now', '-2 days')),
  (2, 1, 2,    'B2', 'paid', 'kakaopay', 22500, datetime('now', '-1 days'), datetime('now', '-1 days')),
  (3, 1, NULL, 'C7', 'paid', 'counter',  9000,  datetime('now', '-6 days'), datetime('now', '-6 days'));

INSERT OR IGNORE INTO order_items (id, order_id, menu_id, name, price, quantity) VALUES
  (1, 1, 1, '김치찌개', 9000,  1),
  (2, 1, 3, '제육볶음', 11000, 1),
  (3, 2, 7, '갈비탕',   13000, 1),
  (4, 2, 6, '물냉면',   9500,  1),
  (5, 3, 1, '김치찌개', 9000,  1);
`;

let _db: DatabaseSync | null = null;

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

function parseTags(raw: unknown): MenuTags {
  if (raw && typeof raw === "object") return raw as MenuTags;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as MenuTags;
    } catch {
      return {};
    }
  }
  return {};
}

/** days → SQLite datetime modifier ("-30 days") */
function since(days: number): string {
  return `-${Math.max(0, Math.floor(days))} days`;
}

type SqlParam = string | number | null;

/** node:sqlite 는 결과를 Record<string, unknown> 로 주므로 헬퍼에서 캐스팅을 모은다. */
function query<T>(sql: string, ...params: SqlParam[]): T[] {
  // node:sqlite returns null-prototype row objects, which React Server
  // Components refuse to pass to Client Components as props ("Classes or
  // null prototypes are not supported"). Spread into plain objects here so
  // every adapter method returns RSC-safe rows.
  const rows = db().prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map((row) => ({ ...row }) as T);
}
function queryOne<T>(sql: string, ...params: SqlParam[]): T {
  const row = db().prepare(sql).get(...params) as
    | Record<string, unknown>
    | undefined;
  return (row ? { ...row } : row) as T;
}

interface MenuRow {
  id: number;
  store_id: number;
  name: string;
  price: number;
  description: string | null;
  tags: string | null;
}

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

  async getVisitedStoresByUser(userId) {
    return query<Store>(
      `SELECT DISTINCT s.id, s.name, s.kakao_place_id, s.latitude, s.longitude, s.owner_user_id
       FROM stores s
       JOIN view_logs v ON v.store_id = s.id
       WHERE v.user_id = ?
       ORDER BY s.id`,
      userId,
    );
  },

  async getStoreMenus(storeId) {
    const rows = query<MenuRow>(
      "SELECT id, store_id, name, price, description, tags FROM menus WHERE store_id = ? ORDER BY id",
      storeId,
    );
    return rows.map(
      (r): Menu => ({
        id: r.id,
        store_id: r.store_id,
        name: r.name,
        price: r.price,
        description: r.description ?? null,
        tags: parseTags(r.tags),
      }),
    );
  },

  async getMenuPopularity(storeId, days) {
    const rows = query<{ menu_id: number; order_count: number }>(
      `SELECT menu_id, COUNT(*) AS order_count
       FROM view_logs
       WHERE store_id = ? AND action_type = 'order'
         AND created_at >= datetime('now', ?)
       GROUP BY menu_id`,
      storeId,
      since(days),
    );
    return new Map(rows.map((r) => [Number(r.menu_id), Number(r.order_count)]));
  },

  async getUserRecentLogs(userId, days, limit = 50) {
    const rows = query<{
      menu_id: number;
      action_type: LogEntry["action_type"];
      tags: string | null;
    }>(
      `SELECT vl.menu_id, vl.action_type, m.tags
       FROM view_logs vl
       JOIN menus m ON m.id = vl.menu_id
       WHERE vl.user_id = ? AND vl.created_at >= datetime('now', ?)
       ORDER BY vl.created_at DESC
       LIMIT ?`,
      userId,
      since(days),
      limit,
    );
    return rows.map((r) => ({
      menu_id: Number(r.menu_id),
      action_type: r.action_type,
      tags: parseTags(r.tags),
    }));
  },

  async insertViewLog(input: InsertLogInput) {
    const row = queryOne<{ id: number; created_at: string }>(
      `INSERT INTO view_logs (user_id, table_number, store_id, menu_id, action_type)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id, created_at`,
      input.userId,
      input.tableNumber,
      input.storeId,
      input.menuId,
      input.actionType,
    );
    return { id: Number(row.id), created_at: String(row.created_at) };
  },

  async getDailyVisitors(storeId, days): Promise<DailyVisitorRow[]> {
    const rows = query<{ date: string; views: number; visitors: number }>(
      `SELECT date(created_at) AS date,
              COUNT(*) AS views,
              COUNT(DISTINCT table_number) AS visitors
       FROM view_logs
       WHERE store_id = ? AND created_at >= datetime('now', ?)
       GROUP BY date(created_at)
       ORDER BY 1`,
      storeId,
      since(days),
    );
    return rows.map((r) => ({
      date: String(r.date),
      views: Number(r.views),
      visitors: Number(r.visitors),
    }));
  },

  async getPopularMenus(storeId, days, limit = 10): Promise<PopularMenuRow[]> {
    const rows = query<{ menu_id: number; name: string; order_count: number }>(
      `SELECT m.id AS menu_id, m.name, COUNT(*) AS order_count
       FROM view_logs vl
       JOIN menus m ON m.id = vl.menu_id
       WHERE vl.store_id = ? AND vl.action_type = 'order'
         AND vl.created_at >= datetime('now', ?)
       GROUP BY m.id, m.name
       ORDER BY order_count DESC, m.id
       LIMIT ?`,
      storeId,
      since(days),
      limit,
    );
    return rows.map((r) => ({
      menu_id: Number(r.menu_id),
      name: String(r.name),
      order_count: Number(r.order_count),
    }));
  },

  /* ---------------- 메뉴 관리 (점주용 CRUD) ---------------- */

  async createMenu(storeId, input) {
    const row = queryOne<{ id: number }>(
      `INSERT INTO menus (store_id, name, price, description, tags)
       VALUES (?, ?, ?, ?, ?) RETURNING id`,
      storeId,
      input.name,
      input.price,
      input.description,
      JSON.stringify(input.tags ?? {}),
    );
    return {
      id: Number(row.id),
      store_id: storeId,
      name: input.name,
      price: input.price,
      description: input.description,
      tags: input.tags,
    } satisfies Menu;
  },

  async updateMenu(menuId, input) {
    db()
      .prepare(
        `UPDATE menus SET name = ?, price = ?, description = ?, tags = ? WHERE id = ?`,
      )
      .run(
        input.name,
        input.price,
        input.description,
        JSON.stringify(input.tags ?? {}),
        menuId,
      );
    const row = queryOne<MenuRow | undefined>(
      "SELECT id, store_id, name, price, description, tags FROM menus WHERE id = ?",
      menuId,
    );
    if (!row) return null;
    return {
      id: row.id,
      store_id: row.store_id,
      name: row.name,
      price: row.price,
      description: row.description ?? null,
      tags: parseTags(row.tags),
    } satisfies Menu;
  },

  async deleteMenu(menuId) {
    db().prepare("DELETE FROM menus WHERE id = ?").run(menuId);
  },

  /* ---------------- 주문 / 결제 ---------------- */

  async createOrder(input: NewOrderInput) {
    const d = db();
    // 요청된 메뉴들의 현재 가격을 매장 범위 내에서 조회 (가격 위조 방지)
    const menuRows = query<{ id: number; name: string; price: number }>(
      `SELECT id, name, price FROM menus WHERE store_id = ?`,
      input.storeId,
    );
    const menuMap = new Map(menuRows.map((m) => [Number(m.id), m]));

    const lines = input.items
      .map((it) => {
        const m = menuMap.get(Number(it.menuId));
        const qty = Math.max(1, Math.floor(Number(it.quantity) || 0));
        return m ? { menu_id: m.id, name: m.name, price: m.price, quantity: qty } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (lines.length === 0) throw new Error("주문 항목이 비어 있습니다");

    const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

    d.exec("BEGIN");
    try {
      const order = queryOne<{ id: number }>(
        `INSERT INTO orders (store_id, user_id, table_number, status, total_amount)
         VALUES (?, ?, ?, 'pending', ?) RETURNING id`,
        input.storeId,
        input.userId,
        input.tableNumber,
        total,
      );
      const insItem = d.prepare(
        `INSERT INTO order_items (order_id, menu_id, name, price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
      );
      for (const l of lines) {
        insItem.run(order.id, l.menu_id, l.name, l.price, l.quantity);
      }
      d.exec("COMMIT");
      const created = await this.getOrder(Number(order.id));
      if (!created) throw new Error("주문 생성 실패");
      return created;
    } catch (err) {
      d.exec("ROLLBACK");
      throw err;
    }
  },

  async getOrder(orderId) {
    const o = queryOne<{
      id: number;
      store_id: number;
      user_id: number | null;
      table_number: string | null;
      status: Order["status"];
      payment_method: Order["payment_method"];
      total_amount: number;
      created_at: string;
      paid_at: string | null;
    }>(
      `SELECT id, store_id, user_id, table_number, status, payment_method,
              total_amount, created_at, paid_at
       FROM orders WHERE id = ?`,
      orderId,
    );
    if (!o) return null;

    const items = query<OrderItem>(
      `SELECT id, order_id, menu_id, name, price, quantity
       FROM order_items WHERE order_id = ? ORDER BY id`,
      orderId,
    ).map((r) => ({
      id: Number(r.id),
      order_id: Number(r.order_id),
      menu_id: Number(r.menu_id),
      name: String(r.name),
      price: Number(r.price),
      quantity: Number(r.quantity),
    }));

    return {
      id: Number(o.id),
      store_id: Number(o.store_id),
      user_id: o.user_id == null ? null : Number(o.user_id),
      table_number: o.table_number,
      status: o.status,
      payment_method: o.payment_method,
      total_amount: Number(o.total_amount),
      created_at: String(o.created_at),
      paid_at: o.paid_at == null ? null : String(o.paid_at),
      items,
    } satisfies Order;
  },

  async payOrder(orderId, method: PaymentMethod) {
    const d = db();
    const order = await this.getOrder(orderId);
    if (!order) return null;

    if (order.status === "paid") return order; // 멱등

    d.exec("BEGIN");
    try {
      d.prepare(
        `UPDATE orders SET status='paid', payment_method=?, paid_at=datetime('now')
         WHERE id=?`,
      ).run(method, orderId);

      // 결제 확정 시 추천용 주문 로그 적재 (스펙 4장: order 신호)
      const insLog = d.prepare(
        `INSERT INTO view_logs (user_id, table_number, store_id, menu_id, action_type)
         VALUES (?, ?, ?, ?, 'order')`,
      );
      for (const it of order.items) {
        insLog.run(order.user_id, order.table_number, order.store_id, it.menu_id);
      }
      d.exec("COMMIT");
    } catch (err) {
      d.exec("ROLLBACK");
      throw err;
    }
    return this.getOrder(orderId);
  },

  async listOrders(storeId, days, limit = 50): Promise<OrderSummaryRow[]> {
    const rows = query<{
      id: number;
      table_number: string | null;
      status: OrderSummaryRow["status"];
      payment_method: OrderSummaryRow["payment_method"];
      total_amount: number;
      item_count: number;
      created_at: string;
    }>(
      `SELECT o.id, o.table_number, o.status, o.payment_method, o.total_amount,
              o.created_at,
              (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id) AS item_count
       FROM orders o
       WHERE o.store_id = ? AND o.created_at >= datetime('now', ?)
       ORDER BY o.created_at DESC
       LIMIT ?`,
      storeId,
      since(days),
      limit,
    );
    return rows.map((r) => ({
      id: Number(r.id),
      table_number: r.table_number,
      status: r.status,
      payment_method: r.payment_method,
      total_amount: Number(r.total_amount),
      item_count: Number(r.item_count),
      created_at: String(r.created_at),
    }));
  },

  async getRevenueByDay(storeId, days): Promise<RevenueRow[]> {
    const rows = query<{ date: string; orders: number; revenue: number }>(
      `SELECT date(created_at) AS date,
              COUNT(*) AS orders,
              COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders
       WHERE store_id = ? AND status = 'paid'
         AND created_at >= datetime('now', ?)
       GROUP BY date(created_at)
       ORDER BY 1`,
      storeId,
      since(days),
    );
    return rows.map((r) => ({
      date: String(r.date),
      orders: Number(r.orders),
      revenue: Number(r.revenue),
    }));
  },
};
