/**
 * 카카오 로컬 API(키워드 검색) 응답 파싱.
 * 실제 API 호출은 app/api/kakao/search/route.ts (서버 전용, REST API 키 필요)에서 한다.
 */
export interface KakaoPlace {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface KakaoDocument {
  id?: unknown;
  place_name?: unknown;
  road_address_name?: unknown;
  address_name?: unknown;
  x?: unknown; // 경도
  y?: unknown; // 위도
}

/** 카카오 키워드 검색 원본 응답(documents 배열)을 KakaoPlace[] 로 변환한다. */
export function parseKakaoSearchResults(raw: unknown): KakaoPlace[] {
  if (!raw || typeof raw !== "object" || !("documents" in raw)) return [];
  const documents = (raw as { documents: unknown }).documents;
  if (!Array.isArray(documents)) return [];

  return documents
    .map((d: KakaoDocument) => {
      const placeId = String(d.id ?? "");
      const name = String(d.place_name ?? "");
      const address = String(d.road_address_name || d.address_name || "");
      const latitude = Number(d.y);
      const longitude = Number(d.x);
      if (!placeId || !name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }
      return { placeId, name, address, latitude, longitude };
    })
    .filter((p): p is KakaoPlace => p !== null);
}
