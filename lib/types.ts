export type ActionType = "view" | "order";

export type PriceRange = "low" | "mid" | "high";

/** menus.tags JSONB 형태 */
export interface MenuTags {
  category?: string;
  spicy?: number; // 0 ~ 5
  price_range?: PriceRange;
}

export interface Menu {
  id: number;
  store_id: number;
  name: string;
  price: number;
  description: string | null;
  tags: MenuTags;
}

/** 메뉴 생성/수정 시 클라이언트가 보내는 입력값 */
export interface MenuInput {
  name: string;
  price: number;
  description: string | null;
  tags: MenuTags;
}

/** 추천 계산에 넣는 최소 로그 형태 (view_logs + menus.tags 조인 결과) */
export interface LogEntry {
  menu_id: number;
  action_type: ActionType;
  tags: MenuTags;
}

export interface RankedMenu extends Menu {
  /** 상위 태그와 매칭돼 얻은 추천 점수 (0이면 개인화 매칭 없음) */
  recommendScore: number;
  /** 최근 기간 내 주문 수 */
  popularity: number;
}

/* ------------------------------------------------------------------ */
/* DB 계층 공용 타입 (SQLite / Postgres 어댑터가 공유)                  */
/* ------------------------------------------------------------------ */

export interface InsertLogInput {
  userId: number | null;
  tableNumber: string | null;
  storeId: number;
  menuId: number;
  actionType: ActionType;
}

export interface DailyVisitorRow {
  date: string; // YYYY-MM-DD
  views: number;
  visitors: number; // distinct table_number
}

export interface PopularMenuRow {
  menu_id: number;
  name: string;
  order_count: number;
}

/* ------------------------------------------------------------------ */
/* 주문 / 결제                                                         */
/* ------------------------------------------------------------------ */

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

export type OrderStatus = "pending" | "paid" | "cancelled";
export type PaymentMethod = "card" | "kakaopay" | "counter";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "신용·체크카드",
  kakaopay: "카카오페이",
  counter: "현장 결제",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  cancelled: "취소됨",
};

export interface OrderItem {
  id: number;
  order_id: number;
  menu_id: number;
  name: string; // 주문 시점 스냅샷
  price: number; // 주문 시점 단가 스냅샷
  quantity: number;
}

export interface Order {
  id: number;
  store_id: number;
  user_id: number | null;
  table_number: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total_amount: number;
  created_at: string;
  paid_at: string | null;
  items: OrderItem[];
}

export interface NewOrderInput {
  storeId: number;
  userId: number | null;
  tableNumber: string | null;
  items: { menuId: number; quantity: number }[];
}

export interface RevenueRow {
  date: string; // YYYY-MM-DD
  orders: number;
  revenue: number;
}

export interface OrderSummaryRow {
  id: number;
  table_number: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total_amount: number;
  item_count: number;
  created_at: string;
}

/** 장바구니에 담기는 최소 정보 (localStorage 저장용) */
export interface CartLine {
  menuId: number;
  name: string;
  price: number;
  quantity: number;
}
