"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { signOut } from "next-auth/react";
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
import { useStoreName } from "@/app/ui/useStoreName";
import { fillDays } from "@/lib/chartDays";
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

/** 새 주문 알림음 "띵동" — 소리 파일 없이 Web Audio 로 두 음을 낸다 */
function playDing(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 660].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    const t = now + i * 0.25;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}
// 값 축은 0부터, 눈금은 정수만 (건수·명·원에 0.5 같은 눈금은 의미가 없다)
const COUNT_AXIS = { beginAtZero: true, ticks: { precision: 0 } } as const;
const LINE_OPTS = { ...CHART_OPTS, scales: { y: COUNT_AXIS } } as const;

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
  items_summary: string | null;
}

export default function DashboardPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [range, setRange] = useState(7);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  // 매장 이름은 자주 안 바뀌니 폴링과 별개로 한 번만 불러온다 (QR·메뉴 관리와 공용)
  const storeName = useStoreName(storeId);

  // 새 주문 알림. 브라우저는 사용자가 한 번 누르기 전엔 소리를 막으므로
  // "알림 켜기" 버튼을 눌러야 AudioContext 를 만들 수 있다.
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  /** 이미 본 결제완료 주문 id — 여기 없는 결제완료 주문이 새 주문이다 */
  const seenPaid = useRef<Set<number> | null>(null);
  const seededRange = useRef<number | null>(null);

  const toggleSound = () => {
    if (soundOn) {
      setSoundOn(false);
      return;
    }
    audioRef.current ??= new AudioContext();
    void audioRef.current.resume();
    playDing(audioRef.current); // 켜자마자 한 번 울려서 소리가 나는지 확인
    setSoundOn(true);
  };

  // 새 주문 감지: 첫 로드(또는 기간 변경 직후)에 이미 있던 주문은 조용히 기록만 한다
  useEffect(() => {
    const paidIds = orders.filter((o) => o.status === "paid").map((o) => o.id);
    if (seenPaid.current == null || seededRange.current !== range) {
      seenPaid.current = new Set(paidIds);
      seededRange.current = range;
      return;
    }
    const fresh = paidIds.filter((id) => !seenPaid.current!.has(id));
    fresh.forEach((id) => seenPaid.current!.add(id));
    if (fresh.length > 0 && soundOn && audioRef.current) playDing(audioRef.current);
  }, [orders, range, soundOn]);

  // 탭 제목에 처리 대기 주문 수 — 다른 탭을 보고 있어도 알 수 있게
  const waitingCount = orders.filter((o) => o.status === "paid").length;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) 새 주문 · /, "");
    document.title = waitingCount > 0 ? `(${waitingCount}) 새 주문 · ${base}` : base;
  }, [waitingCount]);

  // 새 주문이 들어오면 자동으로 반영되도록, 대시보드가 열려있는 동안
  // 5초마다 매출/주문을 다시 불러온다. 주문 알림 때문에 탭이 백그라운드여도 계속 부른다.
  // ponytail: 크롬은 5분 넘게 숨겨진 탭의 타이머를 1분 간격으로 늦춘다 — 알림이
  // 늦으면 대시보드를 별도 창으로 띄워 두는 게 확실하다 (푸시 알림은 과한 범위).
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
          if (cancelled) return;
          // 점주 전용 API라 남의 매장이거나 로그아웃 상태면 401/403이 온다
          const msg = String(e.message);
          setError(
            msg.includes("401")
              ? "로그인이 필요합니다. 점주 계정으로 로그인해 주세요."
              : msg.includes("403")
                ? "이 매장의 점주만 볼 수 있는 대시보드입니다."
                : `불러오기 실패: ${msg}`,
          );
        });
    };
    load();
    const interval = setInterval(load, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [storeId, range]);

  // 점주 접수 처리 — 완료(served) / 거절(rejected)
  const [handling, setHandling] = useState<number | null>(null);
  const handleOrder = async (orderId: number, status: "served" | "rejected") => {
    if (status === "rejected" && !confirm(`주문 #${orderId}을(를) 거절할까요?`)) {
      return;
    }
    setHandling(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(String(res.status));
      // 폴링을 기다리지 않고 화면에 바로 반영
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
    } catch (e) {
      setError(`주문 처리 실패 (${(e as Error).message})`);
    } finally {
      setHandling(null);
    }
  };

  const revenueChart = useMemo(() => {
    const rows = fillDays(stats?.revenueByDay ?? [], range, (date) => ({
      date,
      orders: 0,
      revenue: 0,
    }));
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
  }, [stats, range]);

  const visitorChart = useMemo(() => {
    const rows = fillDays(stats?.dailyVisitors ?? [], range, (date) => ({
      date,
      views: 0,
      visitors: 0,
    }));
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
  }, [stats, range]);

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
        <span className="sub">{storeName ?? `매장 ${storeId}`}</span>
        <button
          className="logout"
          onClick={() => signOut({ redirectTo: "/" })}
        >
          로그아웃
        </button>
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
        <button
          className={soundOn ? "active" : ""}
          style={{ marginLeft: "auto" }}
          onClick={toggleSound}
        >
          {soundOn ? "🔔 주문 알림 켜짐" : "🔕 주문 알림 켜기"}
        </button>
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
          <span>📋 메뉴 관리</span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link href={`/dashboard/${storeId}/qr`} className="btn ghost row">
          <span>🔳 테이블 QR 코드 생성</span>
          <span aria-hidden="true">→</span>
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

      <div className="dash-grid">
      <div className="chart-box gc-revenue">
        <h3>일별 매출</h3>
        <div style={{ position: "relative", height: 240 }}>
          <Line data={revenueChart} options={LINE_OPTS} />
        </div>
      </div>

      <div className="chart-box gc-visitors">
        <h3>일별 방문자 · 조회</h3>
        <div style={{ position: "relative", height: 240 }}>
          <Line data={visitorChart} options={LINE_OPTS} />
        </div>
      </div>

      <div className="chart-box gc-menu">
        <h3>인기 메뉴 (주문 수)</h3>
        <div style={{ position: "relative", height: 300 }}>
          <Bar
            data={menuChart}
            options={{
              ...CHART_OPTS,
              indexAxis: "y" as const,
              scales: { x: COUNT_AXIS },
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>

      <aside className="dash-side">
      <div className="chart-box order-queue">
        <h3>최근 주문</h3>
        {orders.length === 0 ? (
          <p className="muted">주문이 없습니다.</p>
        ) : (
          <div className="order-queue-list">
            {orders.map((o) => (
              <div key={o.id} className="order-queue-row">
                <div className="order-queue-top">
                  <span>
                    #{o.id} · 테이블 {o.table_number ?? "-"}
                  </span>
                  <span className={`status ${o.status}`}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </div>
                <div className="order-queue-items">
                  {o.items_summary ?? "-"}
                </div>
                <div className="order-queue-meta">
                  {o.item_count}개 · {won(o.total_amount)}
                  {o.payment_method
                    ? ` · ${PAYMENT_METHOD_LABEL[o.payment_method]}`
                    : ""}
                  {" · "}
                  {new Date(o.created_at.replace(" ", "T")).toLocaleString(
                    "ko-KR",
                    {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </div>
                {o.status === "paid" && (
                  <div className="order-queue-actions">
                    <button
                      className="btn accept"
                      disabled={handling === o.id}
                      onClick={() => handleOrder(o.id, "served")}
                    >
                      완료
                    </button>
                    <button
                      className="btn reject"
                      disabled={handling === o.id}
                      onClick={() => handleOrder(o.id, "rejected")}
                    >
                      거절
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </aside>
      </div>
    </>
  );
}
