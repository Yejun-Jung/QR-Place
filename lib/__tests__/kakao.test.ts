import { describe, expect, it } from "vitest";
import { parseKakaoSearchResults } from "../kakao";

describe("parseKakaoSearchResults", () => {
  it("카카오 키워드 검색 응답을 우리 형식으로 변환한다 (x=경도, y=위도)", () => {
    const raw = {
      documents: [
        {
          id: "12345",
          place_name: "김가네 한식당",
          road_address_name: "서울 중구 세종대로 110",
          address_name: "서울 중구 태평로1가 31",
          x: "126.978000",
          y: "37.566500",
        },
      ],
    };

    expect(parseKakaoSearchResults(raw)).toEqual([
      {
        placeId: "12345",
        name: "김가네 한식당",
        address: "서울 중구 세종대로 110",
        latitude: 37.5665,
        longitude: 126.978,
      },
    ]);
  });

  it("도로명 주소가 없으면 지번 주소로 대체한다", () => {
    const raw = {
      documents: [
        {
          id: "1",
          place_name: "가게",
          road_address_name: "",
          address_name: "지번 주소",
          x: "127",
          y: "37",
        },
      ],
    };
    expect(parseKakaoSearchResults(raw)[0].address).toBe("지번 주소");
  });

  it("documents 가 없으면 빈 배열을 반환한다", () => {
    expect(parseKakaoSearchResults({})).toEqual([]);
    expect(parseKakaoSearchResults(null)).toEqual([]);
  });
});
