"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/app/ui/AppHeader";
import type { KakaoPlace } from "@/lib/kakao";

export default function NewStorePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<KakaoPlace[] | null>(null);
  const [selected, setSelected] = useState<KakaoPlace | null>(null);
  const [searching, setSearching] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch(`/api/kakao/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setPlaces(data.places);
    } catch (e) {
      setError(`검색 실패 (${(e as Error).message})`);
      setPlaces(null);
    } finally {
      setSearching(false);
    }
  };

  const register = async () => {
    if (!selected) return;
    setRegistering(true);
    setError(null);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          kakaoPlaceId: selected.placeId,
          latitude: selected.latitude,
          longitude: selected.longitude,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      router.push(`/dashboard/${data.store.id}`);
    } catch (e) {
      setError(`등록 실패 (${(e as Error).message})`);
      setRegistering(false);
    }
  };

  return (
    <>
      <AppHeader title="신규 매장 등록" />

      <div className="section">
        {error && <p className="blurb">{error}</p>}
        <label className="field">매장명으로 검색</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="inp"
            style={{ flex: "1 1 0%" }}
            placeholder="예: 김가네 한식당"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button
            className="btn"
            style={{
              width: "auto",
              flexShrink: 0,
              whiteSpace: "nowrap",
              padding: "0 20px",
            }}
            onClick={search}
            disabled={searching || !query.trim()}
          >
            {searching ? "검색 중…" : "검색"}
          </button>
        </div>
      </div>

      {places && (
        <>
          {places.length === 0 ? (
            <p className="empty">검색 결과가 없습니다.</p>
          ) : (
            <div className="pay-methods">
              {places.map((p) => (
                <div
                  key={p.placeId}
                  className={`pay-method${
                    selected?.placeId === p.placeId ? " active" : ""
                  }`}
                  onClick={() => setSelected(p)}
                >
                  <span className="radio" />
                  <div>
                    <div>{p.name}</div>
                    <div
                      className="muted"
                      style={{ fontWeight: 400, marginTop: 2 }}
                    >
                      {p.address}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="section">
          <button className="btn" onClick={register} disabled={registering}>
            {registering ? "등록 중…" : `"${selected.name}" 이 매장으로 등록`}
          </button>
        </div>
      )}
    </>
  );
}
