"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { won } from "@/lib/useCart";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type Order,
  type Store,
} from "@/lib/types";

function OrderView() {
  const { storeId, orderId } = useParams<{
    storeId: string;
    orderId: string;
  }>();
  const search = useSearchParams();
  const router = useRouter();
  const table = search.get("table");
  const userId = search.get("userId");

  const [order, setOrder] = useState<Order | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((j) => {
        setOrder(j.order);
        setStore(j.store);
      })
      .catch((e) => setError(`주문을 불러오지 못했습니다 (${e.message})`));
  }, [orderId]);

  const backToMenu = () => {
    const p = new URLSearchParams();
    if (table) p.set("table", table);
    if (userId) p.set("userId", userId);
    router.push(`/stores/${storeId}?${p.toString()}`);
  };

  if (error)
    return (
      <>
        <header className="app-header">
          <h1>주문</h1>
        </header>
        <p className="blurb">{error}</p>
      </>
    );
  if (!order) return <p className="empty">불러오는 중…</p>;

  const paid = order.status === "paid";

  return (
    <>
      <header className="app-header">
        <h1>{store?.name ?? "주문 완료"}</h1>
      </header>

      <div className="done">
        <div
          className="check"
          style={{ background: paid ? "var(--ok)" : "var(--warn)" }}
        >
          {paid ? "✓" : "⏳"}
        </div>
        <h2>{paid ? "결제 완료" : ORDER_STATUS_LABEL[order.status]}</h2>
        <p className="muted">
          주문번호 #{order.id} · 테이블 {order.table_number ?? "-"}
        </p>
        {paid && (
          <p className="muted">
            주방으로 주문이 전달되었습니다. 잠시만 기다려 주세요!
          </p>
        )}
      </div>

      <div className="summary">
        {order.items.map((it) => (
          <div className="row" key={it.id}>
            <span>
              {it.name} × {it.quantity}
            </span>
            <span>{won(it.price * it.quantity)}</span>
          </div>
        ))}
        <div className="row">
          <span className="muted">결제 수단</span>
          <span className="muted">
            {order.payment_method
              ? PAYMENT_METHOD_LABEL[order.payment_method]
              : "-"}
          </span>
        </div>
        {order.paid_at && (
          <div className="row">
            <span className="muted">결제 시각</span>
            <span className="muted">
              {new Date(order.paid_at.replace(" ", "T")).toLocaleString(
                "ko-KR",
              )}
            </span>
          </div>
        )}
        <div className="row total">
          <span>총 결제 금액</span>
          <span>{won(order.total_amount)}</span>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <button className="btn ghost" onClick={backToMenu}>
          메뉴판으로 돌아가기
        </button>
      </div>
    </>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<p className="empty">불러오는 중…</p>}>
      <OrderView />
    </Suspense>
  );
}
