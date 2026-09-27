/**
 * 권한 가드 테스트.
 *
 * 여기가 깨지면 곧바로 "남의 매장 매출이 보인다 / 남의 주문을 취소할 수 있다"로
 * 이어지므로, 통과(null)와 차단(4xx) 양쪽을 모두 고정해둔다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, Store } from "../types";

const mockAuth = vi.fn();
const mockGetStore = vi.fn();
const mockGetStoreMenus = vi.fn();

vi.mock("@/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/db", () => ({
  getStore: (id: number) => mockGetStore(id),
  getStoreMenus: (id: number) => mockGetStoreMenus(id),
}));

const { denyUnlessOrderOwner, denyUnlessStoreOwner, resolveUserId } =
  await import("../authz");

const store: Store = {
  id: 1,
  name: "가게",
  kakao_place_id: null,
  latitude: null,
  longitude: null,
  owner_user_id: 7,
};

const order = (over: Partial<Order> = {}): Order =>
  ({
    id: 10,
    store_id: 1,
    user_id: null,
    table_number: "A1",
    status: "pending",
    payment_method: null,
    total_amount: 9000,
    created_at: "",
    paid_at: null,
    items: [],
    ...over,
  }) as Order;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStore.mockResolvedValue(store);
  mockGetStoreMenus.mockResolvedValue([{ id: 100 }, { id: 101 }]);
});

describe("denyUnlessStoreOwner", () => {
  it("비로그인은 401", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await denyUnlessStoreOwner(1))?.status).toBe(401);
  });

  it("다른 사람 매장이면 403", async () => {
    mockAuth.mockResolvedValue({ user: { id: 99 } });
    expect((await denyUnlessStoreOwner(1))?.status).toBe(403);
  });

  it("소유자는 통과", async () => {
    mockAuth.mockResolvedValue({ user: { id: 7 } });
    expect(await denyUnlessStoreOwner(1)).toBeNull();
  });

  it("없는 매장은 404", async () => {
    mockAuth.mockResolvedValue({ user: { id: 7 } });
    mockGetStore.mockResolvedValue(null);
    expect((await denyUnlessStoreOwner(1))?.status).toBe(404);
  });

  it("소유자라도 다른 매장의 menuId 는 404 (id 갈아끼우기 차단)", async () => {
    mockAuth.mockResolvedValue({ user: { id: 7 } });
    expect((await denyUnlessStoreOwner(1, 999))?.status).toBe(404);
    expect(await denyUnlessStoreOwner(1, 100)).toBeNull();
  });
});

describe("denyUnlessOrderOwner", () => {
  it("테이블 번호가 맞으면 통과", async () => {
    expect(await denyUnlessOrderOwner(order(), "A1")).toBeNull();
  });

  it("테이블 번호가 틀리면 403", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await denyUnlessOrderOwner(order(), "Z9"))?.status).toBe(403);
  });

  it("테이블 번호를 아예 안 보내면 403", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await denyUnlessOrderOwner(order(), null))?.status).toBe(403);
  });

  it("로그인 주문은 본인 세션으로도 통과", async () => {
    mockAuth.mockResolvedValue({ user: { id: 7 } });
    expect(await denyUnlessOrderOwner(order({ user_id: 7 }), null)).toBeNull();
  });

  it("로그인 주문이어도 남의 세션이면 403", async () => {
    mockAuth.mockResolvedValue({ user: { id: 8 } });
    expect((await denyUnlessOrderOwner(order({ user_id: 7 }), "Z9"))?.status).toBe(403);
  });

  it("테이블 없는 주문은 테이블 값도 없을 때만 통과", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await denyUnlessOrderOwner(order({ table_number: null }), null)).toBeNull();
    expect(
      (await denyUnlessOrderOwner(order({ table_number: null }), "A1"))?.status,
    ).toBe(403);
  });
});

describe("resolveUserId", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("로그인 세션이 있으면 클라이언트가 보낸 id 는 무시한다", async () => {
    mockAuth.mockResolvedValue({ user: { id: 7 } });
    expect(await resolveUserId("1")).toBe(7);
  });

  it("배포 환경에서는 비로그인 요청의 userId 를 받지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockAuth.mockResolvedValue(null);
    expect(await resolveUserId("1")).toBeNull();
  });

  it("개발 환경에서는 데모용 ?userId= 를 받아준다", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await resolveUserId("1")).toBe(1);
    expect(await resolveUserId("")).toBeNull();
    expect(await resolveUserId("abc")).toBeNull();
  });
});
