"use client";

/// <reference types="kakao.maps.d.ts" />

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { CustomOverlayMap, Map, MapMarker } from "react-kakao-maps-sdk";
import type { Store } from "@/lib/types";
import { averageCenter, storeHref } from "@/lib/mapView";

const FALLBACK_CENTER = { lat: 37.5665, lng: 126.978 }; // 서울시청 (매장 전부 좌표 없을 때만)

export default function MapCanvas({
  stores,
  fromStoreId = null,
  table = null,
}: {
  stores: Store[];
  /** 이 지도로 들어오기 직전에 있던 매장 id */
  fromStoreId?: string | null;
  /** 그 매장에서 앉아 있던 테이블 번호 */
  table?: string | null;
}) {
  /** 원래 앉아 있던 매장으로 돌아갈 때만 테이블 번호를 복원한다 (lib/mapView.ts) */
  const hrefFor = (storeId: number) => storeHref(storeId, fromStoreId, table);
  const isMyTable = (storeId: number) => hrefFor(storeId).includes("?table=");

  const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "";
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
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

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appkey)}&autoload=false`}
        strategy="afterInteractive"
        onReady={() => {
          if (typeof kakao === "undefined" || !kakao?.maps) {
            setSdkError(true);
            return;
          }
          try {
            kakao.maps.load(() => setSdkReady(true));
          } catch {
            setSdkError(true);
          }
        }}
        onError={() => setSdkError(true)}
      />
      {sdkError && (
        <p className="blurb">
          지도를 불러오지 못했어요. 카카오 개발자 콘솔에서 이 도메인이 JS SDK
          도메인으로 등록됐는지 확인해주세요.
        </p>
      )}
      {!sdkError && !sdkReady && <p className="empty">지도를 불러오는 중…</p>}
      {sdkReady && (
        <Map
          center={center}
          style={{ width: "100%", height: "calc(100vh - 56px)" }}
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
                <Link href={hrefFor(selected.id)}>
                  {isMyTable(selected.id)
                    ? `메뉴판으로 돌아가기 (테이블 ${table})`
                    : "메뉴 보기 (열람 전용)"}
                </Link>
              </div>
            </CustomOverlayMap>
          )}
        </Map>
      )}
    </>
  );
}
