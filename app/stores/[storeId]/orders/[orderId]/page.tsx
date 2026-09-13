"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePolling } from "@/app/ui/usePolling";
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

  // 점주가 완료/거절하면 이 화면에도 바로 반영한다.
  // 아직 처리 전(paid)이면 2.5초, 처리가 끝났으면 느리게 확인한다 (usePolling).
  usePolling(async () => {
    const r = await fetch(`/api/orders/${orderId}`);
    if (!r.ok) {
      setError(`주문을 불러오지 못했습니다 (${r.status})`);
      return false;
    }
    const j = (await r.json()) as { order: Order; store: Store };
    setOrder(j.order);
    setStore(j.store);
    return j.order.status === "paid"; // 점주 처리를 기다리는 동안만 빠르게
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
  const served = order.status === "served";
  const rejected = order.status === "rejected";
  // 주문한 메뉴 이름 (알림 문구에 그대로 쓴다)
  const itemNames = order.items
    .map((it) => `${it.name} x${it.quantity}`)
    .join(", ");

  return (
    <>
      <header className="app-header">
        <h1>{store?.name ?? "주문 완료"}</h1>
      </header>

      {/* 점주가 처리하면 폴링이 잡아서 여기에 바로 뜬다 */}
      {(served || rejected) && (
        <div className={`order-notice ${order.status}`}>
          <span>
            {served
              ? `주문한 메뉴(${itemNames})가 곧 나가요!`
              : `주문한 메뉴(${itemNames})가 거절되었습니다.`}
          </span>
        </div>
      )}

      <div className="done">
        <div
          className="check"
          style={{
            background: rejected
              ? "#b91c1c"
              : served || paid
                ? "var(--ok)"
                : "var(--warn)",
          }}
        >
          {rejected ? "✕" : served ? "🍳" : paid ? "✓" : "⏳"}
        </div>
        <h2>
          {served
            ? "준비 중이에요"
            : rejected
              ? "주문이 거절되었습니다"
              : paid
                ? "결제 완료"
                : ORDER_STATUS_LABEL[order.status]}
        </h2>
        <p className="muted">
          주문번호 #{order.id} · 테이블 {order.table_number ?? "-"}
        </p>
        {paid && (
          <p className="muted">
            주방으로 주문이 전달되었습니다. 잠시만 기다려 주세요!
          </p>
        )}
        {served && <p className="muted">곧 자리로 가져다 드릴게요.</p>}
        {rejected && (
          <p className="muted">
            재료 소진 등으로 준비가 어려워요. 직원에게 문의해 주세요.
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
