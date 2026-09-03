import { describe, expect, it } from "vitest";
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
