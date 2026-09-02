import { describe, expect, it } from "vitest";
import { buildTableQrUrl } from "../qr";

describe("buildTableQrUrl", () => {
  it("origin, storeId, table 번호로 손님용 메뉴판 URL을 만든다", () => {
    expect(buildTableQrUrl("https://qr-place.example", "1", "3")).toBe(
      "https://qr-place.example/stores/1?table=3",
    );
  });

  it("origin 끝의 슬래시를 제거한다", () => {
    expect(buildTableQrUrl("https://qr-place.example/", "1", "3")).toBe(
      "https://qr-place.example/stores/1?table=3",
    );
  });

  it("테이블 번호를 URL 인코딩한다", () => {
    expect(buildTableQrUrl("https://qr-place.example", "1", "A 1")).toBe(
      "https://qr-place.example/stores/1?table=A%201",
    );
  });
});
