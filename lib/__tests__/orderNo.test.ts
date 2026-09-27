import { describe, expect, it } from "vitest";
import { orderNoLabel } from "../types";

describe("orderNoLabel", () => {
  it("오늘 번호가 있으면 N번", () => {
    expect(orderNoLabel({ id: 47, daily_no: 3, status: "served" })).toBe("3번");
  });

  it("결제 전 주문은 내부 id 대신 (결제 전)", () => {
    expect(orderNoLabel({ id: 48, daily_no: null, status: "pending" })).toBe("(결제 전)");
  });

  it("번호 기능 전의 예전 주문은 내부 id", () => {
    expect(orderNoLabel({ id: 12, daily_no: null, status: "paid" })).toBe("#12");
  });
});
