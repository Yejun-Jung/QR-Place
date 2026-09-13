import { describe, expect, it } from "vitest";
import { storeHref } from "../mapView";

describe("storeHref", () => {
  it("앉아 있던 매장으로 돌아갈 때는 테이블 번호를 되살린다", () => {
    expect(storeHref(1, "1", "A1")).toBe("/stores/1?table=A1");
  });

  it("다른 매장에는 테이블 번호를 붙이지 않는다 (주문이 남의 자리로 찍히는 걸 방지)", () => {
    expect(storeHref(4, "1", "A1")).toBe("/stores/4");
  });

  it("어디서 왔는지 모르거나 테이블이 없으면 그냥 매장 링크", () => {
    expect(storeHref(1, null, "A1")).toBe("/stores/1");
    expect(storeHref(1, "1", null)).toBe("/stores/1");
    expect(storeHref(1, "1", "")).toBe("/stores/1");
  });

  it("테이블 번호에 특수문자가 있어도 안전하게 인코딩한다", () => {
    expect(storeHref(1, "1", "룸 A&B")).toBe("/stores/1?table=%EB%A3%B8%20A%26B");
  });
});
import { averageCenter } from "../mapView";

describe("averageCenter", () => {
  it("매장이 없으면 null을 반환한다", () => {
    expect(averageCenter([])).toBeNull();
  });

  it("매장이 1개면 그 좌표를 그대로 반환한다", () => {
    expect(averageCenter([{ latitude: 37.5, longitude: 127 }])).toEqual({
      lat: 37.5,
      lng: 127,
    });
  });

  it("매장이 여러개면 좌표 평균을 반환한다", () => {
    expect(
      averageCenter([
        { latitude: 37.0, longitude: 127.0 },
        { latitude: 39.0, longitude: 129.0 },
      ]),
    ).toEqual({ lat: 38.0, lng: 128.0 });
  });

  it("좌표가 null인 매장은 평균 계산에서 제외한다", () => {
    expect(
      averageCenter([
        { latitude: 37.0, longitude: 127.0 },
        { latitude: null, longitude: null },
      ]),
    ).toEqual({ lat: 37.0, lng: 127.0 });
  });

  it("좌표가 전부 null이면 null을 반환한다", () => {
    expect(averageCenter([{ latitude: null, longitude: null }])).toBeNull();
  });
});
