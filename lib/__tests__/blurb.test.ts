import { describe, expect, it } from "vitest";
import { generateBlurb } from "../blurb";
import type { LogEntry, RankedMenu } from "../types";

const menu = (over: Partial<RankedMenu> = {}): RankedMenu => ({
  id: 1,
  store_id: 1,
  name: "김치찌개",
  price: 9000,
  description: null,
  tags: { category: "찌개", spicy: 3 },
  recommendScore: 0,
  popularity: 0,
  ...over,
});

describe("generateBlurb", () => {
  it("메뉴가 없으면 기본 문구", () => {
    expect(generateBlurb([], [])).toBe("메뉴를 둘러보세요!");
  });

  it("개인화 점수가 없으면 인기순 문구 (콜드 스타트)", () => {
    const blurb = generateBlurb([menu({ recommendScore: 0 })], []);
    expect(blurb).toContain("가장 많이 시키는");
    expect(blurb).toContain("김치찌개");
  });

  it("매운 취향이면 문구에 반영된다", () => {
    const logs: LogEntry[] = [
      { menu_id: 1, action_type: "order", tags: { category: "찌개", spicy: 4 } },
      { menu_id: 2, action_type: "order", tags: { category: "찌개", spicy: 4 } },
    ];
    const blurb = generateBlurb([menu({ recommendScore: 5 })], logs);
    expect(blurb).toContain("매콤");
    expect(blurb).toContain("김치찌개");
  });

  it("카테고리 취향은 문구에 카테고리명이 들어간다", () => {
    const logs: LogEntry[] = [
      { menu_id: 1, action_type: "order", tags: { category: "찌개", spicy: 0 } },
    ];
    expect(generateBlurb([menu({ recommendScore: 3 })], logs)).toContain("찌개");
  });
});
