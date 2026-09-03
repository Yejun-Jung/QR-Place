"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { won } from "@/lib/useCart";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

const CHART_OPTS = { responsive: true, maintainAspectRatio: false } as const;

interface Stats {
  rangeDays: number;
  totalRevenue: number;
  totalOrders: number;
  dailyVisitors: { date: string; views: number; visitors: number }[];
  popularMenus: { menu_id: number; name: string; order_count: number }[];
  revenueByDay: { date: string; orders: number; revenue: number }[];
}

interface OrderRow {
  id: number;
  table_number: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total_amount: number;
  item_count: number;
  created_at: string;
}

export default function DashboardPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [range, setRange] = useState(7);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 새 주문이 들어오면 자동으로 반영되도록, 대시보드가 열려있는 동안
  // 5초마다 매출/주문을 다시 불러온다(탭이 백그라운드일 땐 쉼).
  useEffect(() => {
    let cancelled = false;

    const load = () => {
      Promise.all([
        fetch(`/api/stores/${storeId}/stats?range=${range}d`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error("stats " + r.status)),
        ),
        fetch(`/api/stores/${storeId}/orders?range=${range}d`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error("orders " + r.status)),
        ),
      ])
        .then(([s, o]) => {
          if (cancelled) return;
          setStats(s);
          setOrders(o.orders);
          setError(null);
        })
        .catch((e) => {
          if (!cancelled) setError(`불러오기 실패: ${e.message}`);
        });
    };
    // 탭이 보일 때만 부른다 — 최초 진입은 무조건 불러오고, 이후 폴링/탭
    // 복귀 시점엔 백그라운드 탭에서 불필요한 요청 안 하게 건너뛴다.
    const loadIfVisible = () => {
      if (!document.hidden) load();
    };

    load();
    const interval = setInterval(loadIfVisible, 5000);
    document.addEventListener("visibilitychange", loadIfVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", loadIfVisible);
    };
  }, [storeId, range]);

  const revenueChart = useMemo(() => {
    const rows = stats?.revenueByDay ?? [];
    return {
      labels: rows.map((r) => r.date.slice(5)),
      datasets: [
        {
          label: "매출(원)",
          data: rows.map((r) => r.revenue),
          borderColor: "#ea580c",
          backgroundColor: "rgba(234,88,12,0.12)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [stats]);

  const visitorChart = useMemo(() => {
    const rows = stats?.dailyVisitors ?? [];
    return {
      labels: rows.map((r) => r.date.slice(5)),
      datasets: [
        {
          label: "방문자(테이블)",
          data: rows.map((r) => r.visitors),
          borderColor: "#ea580c",
          backgroundColor: "#fed7aa",
          tension: 0.3,
        },
        {
          label: "조회",
          data: rows.map((r) => r.views),
          borderColor: "#0ea5e9",
          backgroundColor: "#bae6fd",
          tension: 0.3,
        },
      ],
    };
  }, [stats]);

  const menuChart = useMemo(() => {
    const rows = stats?.popularMenus ?? [];
    return {
      labels: rows.map((r) => r.name),
      datasets: [
        {
          label: "주문 수",
          data: rows.map((r) => r.order_count),
          backgroundColor: "#ea580c",
        },
      ],
    };
  }, [stats]);

  return (
    <>
      <header className="app-header">
        <h1>점주 대시보드</h1>
        <span className="sub">매장 {storeId}</span>
      </header>

      <div className="seg">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            className={range === d ? "active" : ""}
            onClick={() => setRange(d)}
          >
            최근 {d}일
          </button>
        ))}
      </div>

      <div
        className="section"
        style={{
          paddingBottom: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <Link href={`/dashboard/${storeId}/menus`} className="btn ghost row">
          메뉴 관리
        </Link>
        <Link href={`/dashboard/${storeId}/qr`} className="btn ghost row">
          테이블 QR 코드 생성
        </Link>
      </div>

      {error && <p className="blurb">{error}</p>}

      <div className="kpi-grid" style={{ marginTop: 12 }}>
        <div className="kpi">
          <div className="label">기간 매출</div>
          <div className="value">{won(stats?.totalRevenue ?? 0)}</div>
        </div>
        <div className="kpi">
          <div className="label">결제 주문</div>
          <div className="value">{stats?.totalOrders ?? 0}건</div>
        </div>
        <div className="kpi">
          <div className="label">방문자(합계)</div>
          <div className="value">
            {(stats?.dailyVisitors ?? []).reduce(
              (s, r) => s + r.visitors,
              0,
            )}
            명
          </div>
        </div>
      </div>

      <div className="chart-box">
        <h3>일별 매출</h3>
        <div style={{ position: "relative", height: 240 }}>
          <Line data={revenueChart} options={CHART_OPTS} />
        </div>
      </div>

      <div className="chart-box">
        <h3>일별 방문자 · 조회</h3>
        <div style={{ position: "relative", height: 240 }}>
          <Line data={visitorChart} options={CHART_OPTS} />
        </div>
      </div>

      <div className="chart-box">
        <h3>인기 메뉴 (주문 수)</h3>
        <div style={{ position: "relative", height: 300 }}>
          <Bar
            data={menuChart}
            options={{
              ...CHART_OPTS,
              indexAxis: "y" as const,
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>

      <div className="chart-box">
        <h3>최근 주문</h3>
        {orders.length === 0 ? (
          <p className="muted">주문이 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>테이블</th>
                  <th>수량</th>
                  <th>금액</th>
                  <th>결제</th>
                  <th>상태</th>
                  <th>시각</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.table_number ?? "-"}</td>
                    <td>{o.item_count}</td>
                    <td>{won(o.total_amount)}</td>
                    <td>
                      {o.payment_method
                        ? PAYMENT_METHOD_LABEL[o.payment_method]
                        : "-"}
                    </td>
                    <td>
                      <span className={`status ${o.status}`}>
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="muted">
                      {new Date(
                        o.created_at.replace(" ", "T"),
                      ).toLocaleString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
