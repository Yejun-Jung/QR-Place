"use client";

import { Suspense, useEffect, useState, type ComponentType } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/app/ui/AppHeader";
import { CardIcon, CounterIcon, KakaoPayIcon } from "@/app/ui/PaymentIcons";
import { useCart, won } from "@/lib/useCart";
import {
  PAYMENT_METHOD_LABEL,
  type Order,
  type PaymentMethod,
} from "@/lib/types";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) =>
  String((new Date().getFullYear() + i) % 100).padStart(2, "0"),
);

const METHODS: PaymentMethod[] = ["card", "kakaopay", "counter"];
const METHOD_ICON: Record<PaymentMethod, ComponentType> = {
  card: CardIcon,
  kakaopay: KakaoPayIcon,
  counter: CounterIcon,
};

function CheckoutView() {
  const { storeId } = useParams<{ storeId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const table = search.get("table");
  const userId = search.get("userId");
  const orderId = search.get("orderId");

  const cart = useCart(storeId, table);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [paying, setPaying] = useState(false);

  // 모의 카드 입력
  const [cardNo, setCardNo] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [pw2, setPw2] = useState("");
  const exp = expMonth && expYear ? `${expMonth}/${expYear}` : "";

  useEffect(() => {
    if (!orderId) {
      setError("잘못된 접근입니다 (orderId 없음)");
      return;
    }
    fetch(`/api/orders/${orderId}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((j) => setOrder(j.order))
      .catch((e) => setError(`주문을 불러오지 못했습니다 (${e.message})`));
  }, [orderId]);

  const cardValid =
    method !== "card" ||
    (cardNo.replace(/\s/g, "").length >= 15 &&
      /^\d{2}\/\d{2}$/.test(exp) &&
      cvc.length === 3 &&
      pw2.length === 2);

  const pay = async () => {
    if (!order) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? String(res.status));
      cart.clear();
      const p = new URLSearchParams();
      if (table) p.set("table", table);
      if (userId) p.set("userId", userId);
      router.push(
        `/stores/${storeId}/orders/${order.id}?${p.toString()}`,
      );
    } catch (e) {
      setError(
        `결제 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`,
      );
      setPaying(false);
    }
  };

  if (error && !order)
    return (
      <>
        <AppHeader title="결제" />
        <p className="blurb">{error}</p>
      </>
    );
  if (!order)
    return (
      <>
        <AppHeader title="결제" />
        <p className="empty">불러오는 중…</p>
      </>
    );

  return (
    <>
      <AppHeader title="결제" sub={`주문 #${order.id}`} />

      <h2 className="section-title">주문 내역</h2>
      <div className="summary">
        {order.items.map((it) => (
          <div className="row" key={it.id}>
            <span>
              {it.name} × {it.quantity}
            </span>
            <span>{won(it.price * it.quantity)}</span>
          </div>
        ))}
        <div className="row total">
          <span>결제 금액</span>
          <span>{won(order.total_amount)}</span>
        </div>
      </div>

      <h2 className="section-title">결제 수단</h2>
      <div className="pay-methods">
        {METHODS.map((m) => {
          const Icon = METHOD_ICON[m];
          return (
            <div
              key={m}
              className={`pay-method${method === m ? " active" : ""}`}
              onClick={() => setMethod(m)}
            >
              <span className="radio" />
              <Icon />
              <span>{PAYMENT_METHOD_LABEL[m]}</span>
            </div>
          );
        })}
      </div>

      {method === "card" && (
        <div className="card-form">
          <div>
            <label className="field">카드 번호</label>
            <input
              className="inp"
              type="password"
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              value={cardNo}
              maxLength={19}
              onChange={(e) =>
                setCardNo(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 16)
                    .replace(/(\d{4})(?=\d)/g, "$1 "),
                )
              }
            />
          </div>
          <div className="two">
            <div>
              <label className="field">유효기간</label>
              <div className="two">
                <select
                  className="inp"
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                >
                  <option value="">월</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  className="inp"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                >
                  <option value="">년</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="field">CVC</label>
              <input
                className="inp"
                type="password"
                inputMode="numeric"
                placeholder="000"
                value={cvc}
                maxLength={3}
                onChange={(e) =>
                  setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))
                }
              />
            </div>
          </div>
          <div>
            <label className="field">비밀번호 앞 2자리</label>
            <input
              className="inp"
              type="password"
              inputMode="numeric"
              placeholder="••"
              value={pw2}
              maxLength={2}
              onChange={(e) =>
                setPw2(e.target.value.replace(/\D/g, "").slice(0, 2))
              }
            />
          </div>
        </div>
      )}

      <div className="notice">
        데모용 모의 결제입니다. 실제 카드 승인·청구는 일어나지 않습니다.
        {method === "kakaopay" && " (카카오페이 결제창 없이 바로 승인 처리)"}
        {method === "counter" && " 현장 결제는 카운터에서 직접 결제해 주세요."}
      </div>

      {error && <p className="blurb">{error}</p>}

      <div style={{ padding: 16 }}>
        <button
          className="btn"
          onClick={pay}
          disabled={paying || !cardValid}
        >
          {paying
            ? "결제 처리 중…"
            : method === "counter"
              ? "주문 확정하기"
              : `${won(order.total_amount)} 결제하기`}
        </button>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p className="empty">불러오는 중…</p>}>
      <CheckoutView />
    </Suspense>
  );
}
