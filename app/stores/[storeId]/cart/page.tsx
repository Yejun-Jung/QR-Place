"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/app/ui/AppHeader";
import { useCart, won } from "@/lib/useCart";

function CartView() {
  const { storeId } = useParams<{ storeId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const userId = search.get("userId");
  const table = search.get("table");

  const cart = useCart(storeId, table);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextQs = useMemo(() => {
    const p = new URLSearchParams();
    if (table) p.set("table", table);
    if (userId) p.set("userId", userId);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [table, userId]);

  const placeOrder = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: Number(storeId),
          tableNumber: table,
          userId,
          items: cart.lines.map((l) => ({
            menuId: l.menuId,
            quantity: l.quantity,
            free: l.free,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? String(res.status));
      const p = new URLSearchParams();
      if (table) p.set("table", table);
      if (userId) p.set("userId", userId);
      p.set("orderId", String(json.order.id));
      router.push(`/stores/${storeId}/checkout?${p.toString()}`);
    } catch (e) {
      setError(
        `주문 생성 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`,
      );
      setSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title="장바구니" sub={`테이블 ${table ?? "-"}`} />

      {!cart.ready ? (
        <p className="empty">불러오는 중…</p>
      ) : cart.lines.length === 0 ? (
        <div className="empty">
          장바구니가 비어 있어요.
          <br />
          <button
            className="btn ghost"
            style={{ marginTop: 16, width: "auto", padding: "10px 18px" }}
            onClick={() => router.push(`/stores/${storeId}${nextQs}`)}
          >
            메뉴 보러 가기
          </button>
        </div>
      ) : (
        <>
          <div className="section" style={{ paddingBottom: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 4,
              }}
            >
              <button
                className="mini-action"
                onClick={() => {
                  if (window.confirm("장바구니를 전부 비우시겠습니까?")) {
                    cart.clear();
                  }
                }}
              >
                전체삭제
              </button>
            </div>

            {cart.lines.map((l) => (
              <div className="line" key={l.menuId}>
                <button
                  className="line-remove"
                  aria-label={`${l.name} 삭제`}
                  onClick={() => cart.remove(l.menuId)}
                >
                  ×
                </button>
                <div>
                  <div className="name">{l.name}</div>
                  <div className="unit">{won(l.price)} / 개</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="stepper" style={{ marginBottom: 6 }}>
                    <button
                      onClick={() => cart.setQty(l.menuId, l.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{l.quantity}</span>
                    <button
                      onClick={() => cart.setQty(l.menuId, l.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {won(l.price * l.quantity)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="summary" style={{ marginTop: 8 }}>
            <div className="row">
              <span>상품 수</span>
              <span>{cart.count}개</span>
            </div>
            <div className="row total">
              <span>합계</span>
              <span>{won(cart.subtotal)}</span>
            </div>
          </div>

          {error && <p className="blurb">{error}</p>}

          <div style={{ padding: 16 }}>
            <button
              className="btn"
              onClick={placeOrder}
              disabled={submitting}
            >
              {submitting ? "주문 생성 중…" : `${won(cart.subtotal)} 주문하기`}
            </button>
          </div>
        </>
      )}
    </>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<p className="empty">불러오는 중…</p>}>
      <CartView />
    </Suspense>
  );
}
