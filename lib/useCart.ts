"use client";

import { useCallback, useEffect, useState } from "react";
import type { CartLine } from "./types";

const keyFor = (storeId: number | string, table: string | null) =>
  `qrp:cart:${storeId}:${table ?? "-"}`;

function read(key: string): CartLine[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, lines: CartLine[]) {
  try {
    localStorage.setItem(key, JSON.stringify(lines));
  } catch {
    /* private mode 등 — 무시 */
  }
}

/**
 * 테이블 단위 장바구니. localStorage(`qrp:cart:{storeId}:{table}`)에 저장돼
 * 새로고침·페이지 이동에도 유지된다. 결제 완료 후 clear() 호출.
 */
export function useCart(storeId: number | string, table: string | null) {
  const key = keyFor(storeId, table);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(read(key));
    setReady(true);
  }, [key]);

  // 다른 탭에서의 변경 반영
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setLines(read(key));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const commit = useCallback(
    (next: CartLine[]) => {
      write(key, next);
      setLines(next);
    },
    [key],
  );

  const add = useCallback(
    (line: Omit<CartLine, "quantity">, qty = 1) => {
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.menuId === line.menuId);
        const next =
          idx >= 0
            ? prev.map((l, i) =>
                i === idx ? { ...l, quantity: l.quantity + qty } : l,
              )
            : [...prev, { ...line, quantity: qty }];
        write(key, next);
        return next;
      });
    },
    [key],
  );

  const setQty = useCallback(
    (menuId: number, qty: number) => {
      setLines((prev) => {
        const next =
          qty <= 0
            ? prev.filter((l) => l.menuId !== menuId)
            : prev.map((l) => (l.menuId === menuId ? { ...l, quantity: qty } : l));
        write(key, next);
        return next;
      });
    },
    [key],
  );

  const remove = useCallback((menuId: number) => setQty(menuId, 0), [setQty]);
  const clear = useCallback(() => commit([]), [commit]);

  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const qtyOf = (menuId: number) =>
    lines.find((l) => l.menuId === menuId)?.quantity ?? 0;

  return { lines, ready, add, setQty, remove, clear, count, subtotal, qtyOf };
}

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
