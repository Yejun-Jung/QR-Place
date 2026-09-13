"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import AppHeader from "@/app/ui/AppHeader";
import { won } from "@/lib/useCart";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/types";

interface OrderRow {
  id: number;
  table_number: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total_amount: number;
  item_count: number;
  created_at: string;
}

function HistoryView() {
  const { storeId } = useParams<{ storeId: string }>();
  const search = useSearchParams();
  const table = search.get("table");
  const userId = search.get("userId");

  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextQs = useMemo(() => {
    const p = new URLSearchParams();
    if (table) p.set("table", table);
    if (userId) p.set("userId", userId);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [table, userId]);

  useEffect(() => {
    const qs = new URLSearchParams({ range: "7d" });
    if (table) qs.set("table", table);
    fetch(`/api/stores/${storeId}/orders/mine?${qs.toString()}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((d: { orders: OrderRow[] }) => setOrders(d.orders))
      .catch((e) => setError(`주문 기록을 불러오지 못했습니다 (${e.message})`));
  }, [storeId, table]);

  return (
    <>
      <AppHeader title="주문 기록" sub={table ? `테이블 ${table}` : undefined} />

      {error && <p className="blurb">{error}</p>}

      {!error && orders === null && <p className="empty">불러오는 중…</p>}

      {orders?.length === 0 && (
        <div className="empty">
          최근 7일간 주문 기록이 없어요.
          <br />
          <Link
            className="btn ghost"
            style={{
              marginTop: 16,
              width: "auto",
              display: "inline-block",
              padding: "10px 18px",
            }}
            href={`/stores/${storeId}${nextQs}`}
          >
            메뉴 보러 가기
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="section">
          <div className="list-head">
            <span className="list-head-label">최근 7일 · {orders.length}건</span>
          </div>
          {orders.map((o) => (
            <Link
              key={o.id}
              className="history-row"
              href={`/stores/${storeId}/orders/${o.id}${nextQs}`}
            >
              <div>
                <div className="name">
                  주문 #{o.id}
                  <span className={`status ${o.status}`}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </div>
                <div className="meta">
                  {new Date(o.created_at).toLocaleString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" · "}
                  {o.item_count}개
                  {o.payment_method
                    ? ` · ${PAYMENT_METHOD_LABEL[o.payment_method]}`
                    : ""}
                </div>
              </div>
              <div className="price">{won(o.total_amount)}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<p className="empty">불러오는 중…</p>}>
      <HistoryView />
    </Suspense>
  );
}
