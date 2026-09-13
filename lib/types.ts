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
  /** 메뉴 사진 (Vercel Blob URL). 없으면 메뉴판에 사진 없이 표시된다. */
  image_url: string | null;
}

/** 메뉴 생성/수정 시 클라이언트가 보내는 입력값 */
export interface MenuInput {
  name: string;
  price: number;
  description: string | null;
  tags: MenuTags;
  imageUrl: string | null;
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

/**
 * pending  결제 전 (장바구니 → 주문 생성 직후)
 * paid     결제 완료 — 점주 확인 대기
 * served   점주가 "완료" 처리 (주방에서 준비 중/나감)
 * rejected 점주가 "거절" 처리 (재료 소진 등)
 * cancelled 손님이 결제 화면에서 이탈 (실제로는 삭제돼서 거의 안 남는다)
 */
export type OrderStatus =
  | "pending"
  | "paid"
  | "served"
  | "rejected"
  | "cancelled";

/** 점주가 주문을 처리할 때 고를 수 있는 상태 */
export const HANDLED_STATUSES = ["served", "rejected"] as const;
export type HandledStatus = (typeof HANDLED_STATUSES)[number];
export type PaymentMethod = "card" | "kakaopay" | "counter";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "신용·체크카드",
  kakaopay: "카카오페이",
  counter: "현장 결제",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "결제 대기",
  paid: "접수 대기",
  served: "준비 완료",
  rejected: "거절됨",
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
  /** free: 룰렛 무료증정 당첨 항목 — 서버가 가격을 0원으로 스냅샷 */
  items: { menuId: number; quantity: number; free?: boolean }[];
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

/** 손님용 주문 기록 — 뭘 시켰는지 바로 보이게 메뉴 요약을 함께 준다 */
export interface CustomerOrderRow extends OrderSummaryRow {
  /** "통닭 x1, 모듬감자튀김 x2" (주문 시점 스냅샷 이름) */
  items_summary: string | null;
}

/** 오늘의 룰렛 스핀 기록 — 무료 증정 항목이 진짜 당첨분인지 서버가 대조하는 근거 */
export interface RouletteSpin {
  id: number;
  /** 'miss' | 'menu' | 'drink' | 'discount10' (lib/recommend.ts 의 RoulettePrizeKind) */
  prize_kind: string | null;
  /** prize_kind 가 'menu' 일 때 당첨된 메뉴 */
  prize_menu_id: number | null;
  /** 이미 무료 증정으로 주문에 사용했으면 그 시각 — 하루에 두 번 못 쓰게 하는 표시 */
  redeemed_at: string | null;
}

/** 장바구니에 담기는 최소 정보 (localStorage 저장용) */
export interface CartLine {
  menuId: number;
  name: string;
  price: number;
  quantity: number;
  /** 룰렛 무료증정으로 담긴 항목 — 주문 생성 시 서버가 0원으로 처리 */
  free?: boolean;
}
