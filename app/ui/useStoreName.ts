"use client";

import { useEffect, useState } from "react";

/**
 * 매장 이름을 한 번만 불러온다 (점주 화면 헤더용).
 * 아직 못 불러왔거나 실패하면 null — 호출부에서 "매장 {id}" 같은 폴백을 쓴다.
 */
export function useStoreName(storeId: string | number): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stores/${storeId}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((d: { store?: { name?: string } }) => {
        if (!cancelled) setName(d.store?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return name;
}
