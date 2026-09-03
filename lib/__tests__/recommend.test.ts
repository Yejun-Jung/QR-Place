import { describe, expect, it } from "vitest";
import type { LogEntry, Menu } from "../types";
import {
  computeTagWeights,
  describeTopTag,
  pickRoulette,
  pickRoulettePrize,
  popularMenus,
  recommendMenus,
  ROULETTE_PRIZES,
  tagTokens,
  topTags,
} from "../recommend";

const menus: Menu[] = [
  { id: 1, store_id: 1, name: "김치찌개", price: 9000, description: null, tags: { category: "찌개", spicy: 3, price_range: "mid" } },
  { id: 2, store_id: 1, name: "된장찌개", price: 8000, description: null, tags: { category: "찌개", spicy: 1, price_range: "mid" } },
  { id: 3, store_id: 1, name: "제육볶음", price: 11000, description: null, tags: { category: "볶음", spicy: 4, price_range: "mid" } },
  { id: 4, store_id: 1, name: "갈비탕", price: 13000, description: null, tags: { category: "탕", spicy: 0, price_range: "high" } },
];

describe("tagTokens", () => {
  it("존재하는 태그만 토큰화한다", () => {
    expect(tagTokens({ category: "찌개", spicy: 3, price_range: "mid" })).toEqual([
      "category:찌개",
      "spicy:3",
      "price_range:mid",
    ]);
    expect(tagTokens({ category: "찌개" })).toEqual(["category:찌개"]);
    expect(tagTokens(null)).toEqual([]);
  });
});

describe("computeTagWeights", () => {
  it("order 는 2배, view 는 1배로 합산한다", () => {
    const logs: LogEntry[] = [
      { menu_id: 1, action_type: "order", tags: { category: "찌개", spicy: 3 } },
      { menu_id: 3, action_type: "view", tags: { category: "볶음", spicy: 3 } },
    ];
    const w = computeTagWeights(logs);
    expect(w.get("category:찌개")).toBe(2);
    expect(w.get("category:볶음")).toBe(1);
    expect(w.get("spicy:3")).toBe(3); // order(2) + view(1)
  });
});

describe("topTags", () => {
  it("가중치 상위 N개를 반환한다", () => {
    const w = new Map([
      ["a", 5],
      ["b", 1],
      ["c", 3],
    ]);
    expect(topTags(w, 2)).toEqual(["a", "c"]);
  });
});

describe("recommendMenus", () => {
  it("상위 태그와 매칭되는 메뉴를 위로 올린다", () => {
    // 유저: 매운 찌개/볶음 취향
    const logs: LogEntry[] = [
      { menu_id: 1, action_type: "order", tags: { category: "찌개", spicy: 3, price_range: "mid" } },
      { menu_id: 3, action_type: "order", tags: { category: "볶음", spicy: 4, price_range: "mid" } },
    ];
    const ranked = recommendMenus(menus, logs, new Map());
    // 갈비탕(탕/안매움)은 최하위여야 한다
    expect(ranked[ranked.length - 1].id).toBe(4);
    // 상위 2개는 찌개/볶음 계열
    expect(ranked.slice(0, 2).map((m) => m.id).sort()).not.toContain(4);
    expect(ranked[0].recommendScore).toBeGreaterThan(0);
  });

  it("동점이면 인기순(주문 수)으로 정렬한다", () => {
    const popularity = new Map([
      [2, 10],
      [1, 1],
    ]);
    // 로그 없음 → 전부 recommendScore 0 → 인기순
    const ranked = recommendMenus(menus, [], popularity);
    expect(ranked[0].id).toBe(2);
  });

  it("콜드 스타트: 로그가 없으면 순수 인기순", () => {
    const popularity = new Map([
      [3, 5],
      [4, 2],
    ]);
    const ranked = popularMenus(menus, popularity);
    expect(ranked.map((m) => m.id)).toEqual([3, 4, 1, 2]);
    expect(ranked.every((m) => m.recommendScore === 0)).toBe(true);
  });
});

describe("describeTopTag", () => {
  it("태그 종류별로 다른 문장을 만든다", () => {
    expect(describeTopTag("category:치킨")).toContain("치킨");
    expect(describeTopTag("spicy:4")).toContain("매운맛");
    expect(describeTopTag("spicy:1")).toContain("순한 맛");
    expect(describeTopTag("price_range:high")).toContain("프리미엄");
    expect(describeTopTag(undefined)).toContain("데이터가 부족");
  });
});

describe("pickRoulette", () => {
  it("상위 N개 중에서만 뽑는다 (rng 주입)", () => {
    const ranked = popularMenus(menus, new Map([[1, 3], [2, 2], [3, 1]]));
    expect(pickRoulette(ranked, 3, () => 0)!.id).toBe(ranked[0].id);
    expect(pickRoulette(ranked, 3, () => 0.99)!.id).toBe(ranked[2].id);
    expect(pickRoulette([], 3)).toBeNull();
  });
});

describe("pickRoulettePrize", () => {
  it("가중치 누적 순서대로 rng 구간에 맞는 상품을 뽑는다 (꽝 50% / 음료수 25% / 할인 15% / 추천메뉴 10%)", () => {
    expect(pickRoulettePrize(() => 0).kind).toBe("miss");
    expect(pickRoulettePrize(() => 0.49).kind).toBe("miss");
    expect(pickRoulettePrize(() => 0.5).kind).toBe("drink");
    expect(pickRoulettePrize(() => 0.74).kind).toBe("drink");
    expect(pickRoulettePrize(() => 0.75).kind).toBe("discount10");
    expect(pickRoulettePrize(() => 0.89).kind).toBe("discount10");
    expect(pickRoulettePrize(() => 0.9).kind).toBe("menu");
    expect(pickRoulettePrize(() => 0.999999).kind).toBe("menu");
  });

  it("ROULETTE_PRIZES 가중치 합은 1이다", () => {
    const sum = ROULETTE_PRIZES.reduce((s, p) => s + p.weight, 0);
    expect(sum).toBeCloseTo(1);
  });
});
