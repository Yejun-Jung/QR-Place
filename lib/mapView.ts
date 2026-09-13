/** 지도 초기 중심 계산에 필요한 최소 좌표 형태 (Store와 호환) */
export interface GeoPoint {
  latitude: number | null;
  longitude: number | null;
}

/**
 * 지도에서 매장으로 이동하는 링크를 만든다.
 *
 * 테이블 번호는 **그 매장 안에서만 유효**하다. 앉아 있던 매장으로 돌아갈 때는
 * 번호를 되돌려주고, 다른 매장으로 갈 때는 붙이지 않는다 — A매장의 'A1'을
 * B매장에 붙이면 주문이 B매장의 엉뚱한 테이블로 찍힌다.
 */
export function storeHref(
  storeId: number,
  fromStoreId: string | null,
  table: string | null,
): string {
  const sameStore = fromStoreId != null && String(storeId) === fromStoreId;
  if (!sameStore || table == null || table === "") return `/stores/${storeId}`;
  return `/stores/${storeId}?table=${encodeURIComponent(table)}`;
}

/**
 * 매장 좌표들의 평균 중심을 계산한다.
 * 좌표가 없는(null) 매장은 제외하고, 남는 매장이 하나도 없으면 null을 반환한다.
 */
export function averageCenter(
  points: GeoPoint[],
): { lat: number; lng: number } | null {
  const valid = points.filter(
    (p): p is { latitude: number; longitude: number } =>
      p.latitude != null && p.longitude != null,
  );
  if (valid.length === 0) return null;

  const sum = valid.reduce(
    (acc, p) => ({ lat: acc.lat + p.latitude, lng: acc.lng + p.longitude }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / valid.length, lng: sum.lng / valid.length };
}
