/** 지도 초기 중심 계산에 필요한 최소 좌표 형태 (Store와 호환) */
export interface GeoPoint {
  latitude: number | null;
  longitude: number | null;
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
