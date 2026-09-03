"use client";

/// <reference types="kakao.maps.d.ts" />

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CustomOverlayMap, Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";
import type { Store } from "@/lib/types";
import { averageCenter } from "@/lib/mapView";

const FALLBACK_CENTER = { lat: 37.5665, lng: 126.978 }; // 서울시청 (매장 전부 좌표 없을 때만)

export default function MapCanvas({ stores }: { stores: Store[] }) {
  const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "";
  const [loading, error] = useKakaoLoader({ appkey });
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const points = useMemo(
    () =>
      stores.filter(
        (s): s is Store & { latitude: number; longitude: number } =>
          s.latitude != null && s.longitude != null,
      ),
    [stores],
  );
  const center = averageCenter(points) ?? FALLBACK_CENTER;
  const selected = points.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (!map || points.length < 2) return;
    const bounds = new kakao.maps.LatLngBounds();
    points.forEach((p) =>
      bounds.extend(new kakao.maps.LatLng(p.latitude, p.longitude)),
    );
    map.setBounds(bounds);
  }, [map, points]);

  if (!appkey) {
    return (
      <p className="blurb">
        NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았어요 (.env.local 확인)
      </p>
    );
  }
  if (error) {
    return <p className="blurb">지도를 불러오지 못했어요.</p>;
  }
  if (loading) {
    return <p className="empty">지도를 불러오는 중…</p>;
  }

  return (
    <Map
      center={center}
      style={{ width: "100%", height: "60vh" }}
      onCreate={setMap}
    >
      {points.map((s) => (
        <MapMarker
          key={s.id}
          position={{ lat: s.latitude, lng: s.longitude }}
          onClick={() => setSelectedId(s.id)}
        />
      ))}
      {selected && (
        <CustomOverlayMap
          position={{ lat: selected.latitude, lng: selected.longitude }}
          yAnchor={1.4}
        >
          <div className="map-overlay">
            <strong>{selected.name}</strong>
            <Link href={`/stores/${selected.id}`}>메뉴 보기 (열람 전용)</Link>
          </div>
        </CustomOverlayMap>
      )}
    </Map>
  );
}
