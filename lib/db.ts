/**
 * DB 접근 진입점.
 *
 * 드라이버 선택 규칙:
 *   - DB_DRIVER=postgres  또는  DB_DRIVER=sqlite  로 강제 지정 가능
 *   - 지정이 없으면 POSTGRES_URL 이 있을 때만 Postgres, 아니면 SQLite(데모 기본값)
 *
 * SQLite 는 프로젝트 루트의 qr-place.db 파일을 쓰며, 최초 실행 시 스키마+시드를
 * 자동 생성한다. 즉 별도 DB 세팅 없이 `npm run dev` 만으로 데모가 돈다.
 */
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

export type { InsertLogInput, DailyVisitorRow, PopularMenuRow };

export interface DbAdapter {
  getStore(storeId: number): Promise<Store | null>;
  createStore(input: NewStoreInput): Promise<Store>;
  getOrCreateUserByKakaoId(
    kakaoId: string,
    nickname: string | null,
  ): Promise<User>;
  getStoreByOwner(ownerUserId: number): Promise<Store | null>;
  getVisitedStoresByUser(userId: number): Promise<Store[]>;
  /** 룰렛 이벤트: 유저×매장 기준 오늘 이미 돌렸는지 */
  hasSpunToday(userId: number, storeId: number): Promise<boolean>;
  recordSpin(userId: number, storeId: number): Promise<void>;
  getStoreMenus(storeId: number): Promise<Menu[]>;
  getMenuPopularity(storeId: number, days: number): Promise<Map<number, number>>;
  getUserRecentLogs(
    userId: number,
    days: number,
    limit?: number,
  ): Promise<LogEntry[]>;
  insertViewLog(input: InsertLogInput): Promise<{ id: number; created_at: string }>;
  getDailyVisitors(storeId: number, days: number): Promise<DailyVisitorRow[]>;
  getPopularMenus(
    storeId: number,
    days: number,
    limit?: number,
  ): Promise<PopularMenuRow[]>;

  /* 메뉴 관리 (점주용 CRUD) */
  createMenu(storeId: number, input: MenuInput): Promise<Menu>;
  updateMenu(menuId: number, input: MenuInput): Promise<Menu | null>;
  deleteMenu(menuId: number): Promise<void>;

  /* 주문 / 결제 */
  createOrder(input: NewOrderInput): Promise<Order>;
  getOrder(orderId: number): Promise<Order | null>;
  /** 모의 결제 처리: status='paid' + view_logs 에 주문 로그 적재 (추천 반영) */
  payOrder(orderId: number, method: PaymentMethod): Promise<Order | null>;
  /** 결제 페이지 이탈 시 취소 — status가 'pending'일 때만 주문(+항목)을 삭제,
   * 기록을 남기지 않는다. 이미 결제/취소됐거나 없는 주문이면 조용히 무시. */
  cancelOrder(orderId: number): Promise<void>;
  listOrders(
    storeId: number,
    days: number,
    limit?: number,
  ): Promise<OrderSummaryRow[]>;
  getRevenueByDay(storeId: number, days: number): Promise<RevenueRow[]>;
}

/** ?range=7d / ?days=30 → 숫자(일). 잘못된 값은 fallback. */
export function parseRangeDays(value: string | null, fallback = 30): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function usePostgres(): boolean {
  const driver = process.env.DB_DRIVER?.toLowerCase();
  if (driver === "postgres" || driver === "pg") return true;
  if (driver === "sqlite") return false;
  return Boolean(process.env.POSTGRES_URL);
}

let adapterPromise: Promise<DbAdapter> | null = null;
function getAdapter(): Promise<DbAdapter> {
  if (!adapterPromise) {
    adapterPromise = usePostgres()
      ? import("./db.postgres").then((m) => m.postgresAdapter)
      : import("./db.sqlite").then((m) => m.sqliteAdapter);
  }
  return adapterPromise;
}

export async function getStoreMenus(storeId: number) {
  return (await getAdapter()).getStoreMenus(storeId);
}
export async function getMenuPopularity(storeId: number, days: number) {
  return (await getAdapter()).getMenuPopularity(storeId, days);
}
export async function getUserRecentLogs(
  userId: number,
  days: number,
  limit = 50,
) {
  return (await getAdapter()).getUserRecentLogs(userId, days, limit);
}
export async function insertViewLog(input: InsertLogInput) {
  return (await getAdapter()).insertViewLog(input);
}
export async function getDailyVisitors(storeId: number, days: number) {
  return (await getAdapter()).getDailyVisitors(storeId, days);
}
export async function getPopularMenus(
  storeId: number,
  days: number,
  limit = 10,
) {
  return (await getAdapter()).getPopularMenus(storeId, days, limit);
}
export async function getStore(storeId: number) {
  return (await getAdapter()).getStore(storeId);
}
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
export async function getVisitedStoresByUser(userId: number) {
  return (await getAdapter()).getVisitedStoresByUser(userId);
}
export async function hasSpunToday(userId: number, storeId: number) {
  return (await getAdapter()).hasSpunToday(userId, storeId);
}
export async function recordSpin(userId: number, storeId: number) {
  return (await getAdapter()).recordSpin(userId, storeId);
}
export async function createMenu(storeId: number, input: MenuInput) {
  return (await getAdapter()).createMenu(storeId, input);
}
export async function updateMenu(menuId: number, input: MenuInput) {
  return (await getAdapter()).updateMenu(menuId, input);
}
export async function deleteMenu(menuId: number) {
  return (await getAdapter()).deleteMenu(menuId);
}
export async function createOrder(
  input: import("./types").NewOrderInput,
) {
  return (await getAdapter()).createOrder(input);
}
export async function getOrder(orderId: number) {
  return (await getAdapter()).getOrder(orderId);
}
export async function payOrder(
  orderId: number,
  method: import("./types").PaymentMethod,
) {
  return (await getAdapter()).payOrder(orderId, method);
}
export async function cancelOrder(orderId: number) {
  return (await getAdapter()).cancelOrder(orderId);
}
export async function listOrders(storeId: number, days: number, limit = 50) {
  return (await getAdapter()).listOrders(storeId, days, limit);
}
export async function getRevenueByDay(storeId: number, days: number) {
  return (await getAdapter()).getRevenueByDay(storeId, days);
}
