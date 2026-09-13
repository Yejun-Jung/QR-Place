/**
 * POST /api/orders 의 무료증정(0원) 검증 테스트.
 *
 * 이 검증이 빠지면 클라이언트가 free:true 만 붙여서 전 메뉴를 0원에 주문할 수
 * 있다(실제로 뚫려 있던 구멍). 통과/차단 조건을 여기 고정해둔다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockCreateOrder = vi.fn();
const mockGetTodaySpin = vi.fn();
const mockRedeemSpin = vi.fn();

vi.mock("@/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/db", () => ({
  createOrder: (input: unknown) => mockCreateOrder(input),
  getTodaySpin: (u: number, s: number) => mockGetTodaySpin(u, s),
  redeemSpin: (id: number) => mockRedeemSpin(id),
}));

const { POST } = await import("@/app/api/orders/route");

/** 핸들러는 req.json() 만 쓰므로 그 부분만 흉내낸다 */
const req = (body: unknown) =>
  ({ json: async () => body }) as unknown as NextRequest;

const FREE_MENU_ID = 5;
const order = (body: Record<string, unknown> = {}) => ({
  storeId: 1,
  tableNumber: "A1",
  items: [{ menuId: FREE_MENU_ID, quantity: 1, free: true }],
  ...body,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: 3 } });
  mockCreateOrder.mockResolvedValue({ id: 99, total_amount: 0 });
  mockGetTodaySpin.mockResolvedValue({
    id: 42,
    prize_kind: "menu",
    prize_menu_id: FREE_MENU_ID,
    redeemed_at: null,
  });
});

describe("POST /api/orders — 무료증정 검증", () => {
  it("오늘 당첨된 그 메뉴 1개면 통과하고 당첨을 소진 처리한다", async () => {
    const res = await POST(req(order()));
    expect(res.status).toBe(201);
    expect(mockRedeemSpin).toHaveBeenCalledWith(42);
  });

  it("당첨 기록이 없으면 403", async () => {
    mockGetTodaySpin.mockResolvedValue(null);
    const res = await POST(req(order()));
    expect(res.status).toBe(403);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it("당첨 메뉴가 아닌 다른 메뉴를 0원으로 요청하면 403", async () => {
    const res = await POST(
      req(order({ items: [{ menuId: 999, quantity: 1, free: true }] })),
    );
    expect(res.status).toBe(403);
  });

  it("꽝(menu 가 아닌 상품) 당첨이면 403", async () => {
    mockGetTodaySpin.mockResolvedValue({
      id: 42,
      prize_kind: "miss",
      prize_menu_id: null,
      redeemed_at: null,
    });
    expect((await POST(req(order()))).status).toBe(403);
  });

  it("이미 사용한 당첨이면 403 (하루에 두 번 못 받는다)", async () => {
    mockGetTodaySpin.mockResolvedValue({
      id: 42,
      prize_kind: "menu",
      prize_menu_id: FREE_MENU_ID,
      redeemed_at: "2026-09-13T00:00:00Z",
    });
    expect((await POST(req(order()))).status).toBe(403);
  });

  it("무료 수량을 2개로 부풀리면 403", async () => {
    const res = await POST(
      req(order({ items: [{ menuId: FREE_MENU_ID, quantity: 2, free: true }] })),
    );
    expect(res.status).toBe(403);
  });

  it("비로그인 상태에서 무료증정을 요청하면 403", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await POST(req(order()))).status).toBe(403);
  });

  it("무료 항목이 없는 평범한 주문은 그대로 통과한다", async () => {
    const res = await POST(
      req(order({ items: [{ menuId: 1, quantity: 2 }] })),
    );
    expect(res.status).toBe(201);
    expect(mockGetTodaySpin).not.toHaveBeenCalled();
    expect(mockRedeemSpin).not.toHaveBeenCalled();
  });

  it("수량이 0 이하인 항목만 있으면 400", async () => {
    const res = await POST(req(order({ items: [{ menuId: 1, quantity: 0 }] })));
    expect(res.status).toBe(400);
  });
});
