/** Vercel Postgres 어댑터 (스펙의 정식 스택). POSTGRES_URL 필요. */
import { sql } from "@vercel/postgres";
import type { DbAdapter } from "./db";
import type {
  DailyVisitorRow,
  InsertLogInput,
  LogEntry,
  Menu,
  NewOrderInput,
  Order,
  OrderItem,
  OrderSummaryRow,
  PaymentMethod,
  PopularMenuRow,
  RevenueRow,
  Store,
} from "./types";

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
    if (existing[0]) {
      // 이전 로그인 때 닉네임을 못 받아왔거나(null) 바뀐 경우 최신 값으로 동기화
      if (nickname && nickname !== existing[0].nickname) {
        const { rows: updated } = await sql<{
          id: number;
          kakao_id: string;
          nickname: string | null;
        }>`
          UPDATE users SET nickname = ${nickname} WHERE id = ${existing[0].id}
          RETURNING id, kakao_id, nickname
        `;
        return updated[0];
      }
      return existing[0];
    }
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

  async getVisitedStoresByUser(userId) {
    const { rows } = await sql<Store>`
      SELECT DISTINCT s.id, s.name, s.kakao_place_id, s.latitude, s.longitude, s.owner_user_id
      FROM stores s
      JOIN view_logs v ON v.store_id = s.id
      WHERE v.user_id = ${userId}
      ORDER BY s.id
    `;
    return rows;
  },

  async hasSpunToday(userId, storeId) {
    const { rows } = await sql<{ n: number }>`
      SELECT COUNT(*)::int AS n FROM roulette_spins
      WHERE user_id = ${userId} AND store_id = ${storeId}
        AND spun_at::date = CURRENT_DATE
    `;
    return (rows[0]?.n ?? 0) > 0;
  },

  async recordSpin(userId, storeId) {
    await sql`
      INSERT INTO roulette_spins (user_id, store_id) VALUES (${userId}, ${storeId})
    `;
  },

  async getStoreMenus(storeId) {
    const { rows } = await sql<Menu>`
      SELECT id, store_id, name, price, description, tags
      FROM menus
      WHERE store_id = ${storeId}
      ORDER BY id
    `;
    return rows;
  },

  async getMenuPopularity(storeId, days) {
    const { rows } = await sql<{ menu_id: number; order_count: number }>`
      SELECT menu_id, COUNT(*)::int AS order_count
      FROM view_logs
      WHERE store_id = ${storeId}
        AND action_type = 'order'
        AND created_at >= NOW() - ${days} * INTERVAL '1 day'
      GROUP BY menu_id
    `;
    return new Map(rows.map((r) => [r.menu_id, Number(r.order_count)]));
  },

  async getUserRecentLogs(userId, days, limit = 50) {
    const { rows } = await sql<LogEntry>`
      SELECT vl.menu_id, vl.action_type, m.tags
      FROM view_logs vl
      JOIN menus m ON m.id = vl.menu_id
      WHERE vl.user_id = ${userId}
        AND vl.created_at >= NOW() - ${days} * INTERVAL '1 day'
      ORDER BY vl.created_at DESC
      LIMIT ${limit}
    `;
    return rows;
  },

  async insertViewLog(input: InsertLogInput) {
    const { rows } = await sql<{ id: number; created_at: string }>`
      INSERT INTO view_logs (user_id, table_number, store_id, menu_id, action_type)
      VALUES (${input.userId}, ${input.tableNumber}, ${input.storeId}, ${input.menuId}, ${input.actionType})
      RETURNING id, created_at
    `;
    return rows[0];
  },

  async getDailyVisitors(storeId, days): Promise<DailyVisitorRow[]> {
    const { rows } = await sql<DailyVisitorRow>`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS views,
             COUNT(DISTINCT table_number)::int AS visitors
      FROM view_logs
      WHERE store_id = ${storeId}
        AND created_at >= NOW() - ${days} * INTERVAL '1 day'
      GROUP BY 1
      ORDER BY 1
    `;
    return rows;
  },

  async getPopularMenus(storeId, days, limit = 10): Promise<PopularMenuRow[]> {
    const { rows } = await sql<PopularMenuRow>`
      SELECT m.id AS menu_id, m.name, COUNT(*)::int AS order_count
      FROM view_logs vl
      JOIN menus m ON m.id = vl.menu_id
      WHERE vl.store_id = ${storeId}
        AND vl.action_type = 'order'
        AND vl.created_at >= NOW() - ${days} * INTERVAL '1 day'
      GROUP BY m.id, m.name
      ORDER BY order_count DESC, m.id
      LIMIT ${limit}
    `;
    return rows;
  },

  /* ---------------- 메뉴 관리 (점주용 CRUD) ---------------- */

  async createMenu(storeId, input) {
    const { rows } = await sql<Menu>`
      INSERT INTO menus (store_id, name, price, description, tags)
      VALUES (${storeId}, ${input.name}, ${input.price}, ${input.description}, ${JSON.stringify(input.tags ?? {})}::jsonb)
      RETURNING id, store_id, name, price, description, tags
    `;
    return rows[0];
  },

  async updateMenu(menuId, input) {
    const { rows } = await sql<Menu>`
      UPDATE menus
      SET name = ${input.name}, price = ${input.price},
          description = ${input.description}, tags = ${JSON.stringify(input.tags ?? {})}::jsonb
      WHERE id = ${menuId}
      RETURNING id, store_id, name, price, description, tags
    `;
    return rows[0] ?? null;
  },

  async deleteMenu(menuId) {
    await sql`DELETE FROM menus WHERE id = ${menuId}`;
  },

  /* ---------------- 주문 / 결제 ---------------- */

  async createOrder(input: NewOrderInput) {
    const { rows: menuRows } = await sql<{
      id: number;
      name: string;
      price: number;
    }>`
      SELECT id, name, price FROM menus WHERE store_id = ${input.storeId}
    `;
    const menuMap = new Map(menuRows.map((m) => [Number(m.id), m]));

    const lines = input.items
      .map((it) => {
        const m = menuMap.get(Number(it.menuId));
        const qty = Math.max(1, Math.floor(Number(it.quantity) || 0));
        return m
          ? { menu_id: m.id, name: m.name, price: m.price, quantity: qty }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (lines.length === 0) throw new Error("주문 항목이 비어 있습니다");

    const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

    const { rows: orderRows } = await sql<{ id: number }>`
      INSERT INTO orders (store_id, user_id, table_number, status, total_amount)
      VALUES (${input.storeId}, ${input.userId}, ${input.tableNumber}, 'pending', ${total})
      RETURNING id
    `;
    const orderId = Number(orderRows[0].id);

    for (const l of lines) {
      await sql`
        INSERT INTO order_items (order_id, menu_id, name, price, quantity)
        VALUES (${orderId}, ${l.menu_id}, ${l.name}, ${l.price}, ${l.quantity})
      `;
    }

    const created = await this.getOrder(orderId);
    if (!created) throw new Error("주문 생성 실패");
    return created;
  },

  async getOrder(orderId) {
    const { rows } = await sql<Omit<Order, "items">>`
      SELECT id, store_id, user_id, table_number, status, payment_method,
             total_amount, created_at, paid_at
      FROM orders WHERE id = ${orderId}
    `;
    const o = rows[0];
    if (!o) return null;

    const { rows: items } = await sql<OrderItem>`
      SELECT id, order_id, menu_id, name, price, quantity
      FROM order_items WHERE order_id = ${orderId} ORDER BY id
    `;
    return { ...o, items };
  },

  async payOrder(orderId, method: PaymentMethod) {
    const order = await this.getOrder(orderId);
    if (!order) return null;
    if (order.status === "paid") return order;

    await sql`
      UPDATE orders
      SET status = 'paid', payment_method = ${method}, paid_at = NOW()
      WHERE id = ${orderId}
    `;
    for (const it of order.items) {
      await sql`
        INSERT INTO view_logs (user_id, table_number, store_id, menu_id, action_type)
        VALUES (${order.user_id}, ${order.table_number}, ${order.store_id}, ${it.menu_id}, 'order')
      `;
    }
    return this.getOrder(orderId);
  },

  async listOrders(storeId, days, limit = 50): Promise<OrderSummaryRow[]> {
    const { rows } = await sql<OrderSummaryRow>`
      SELECT o.id, o.table_number, o.status, o.payment_method, o.total_amount,
             o.created_at,
             COALESCE((SELECT SUM(quantity)::int FROM order_items WHERE order_id = o.id), 0) AS item_count
      FROM orders o
      WHERE o.store_id = ${storeId}
        AND o.created_at >= NOW() - ${days} * INTERVAL '1 day'
      ORDER BY o.created_at DESC
      LIMIT ${limit}
    `;
    return rows;
  },

  async getRevenueByDay(storeId, days): Promise<RevenueRow[]> {
    const { rows } = await sql<RevenueRow>`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS orders,
             COALESCE(SUM(total_amount), 0)::int AS revenue
      FROM orders
      WHERE store_id = ${storeId} AND status = 'paid'
        AND created_at >= NOW() - ${days} * INTERVAL '1 day'
      GROUP BY 1
      ORDER BY 1
    `;
    return rows;
  },
};
