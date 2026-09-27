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
  orderNoLabel,
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

/**
 * 종을 한 번 친 소리: 배음마다 [배수, 세기, 초당 감쇠 dB] 로 순간적으로 울리고
 * 각자의 속도로 사라진다. 두 옥타브 위(×4) 배음이 기본음보다 커서 쨍한 종소리가 난다.
 */
function strike(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  t: number,
  partials: [number, number, number][],
) {
  for (const [mult, level, dbPerSec] of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq * mult;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + 0.004);
    gain.gain.setTargetAtTime(0, t + 0.004, 8.686 / dbPerSec); // dB/초 → 시간상수
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + 1.2);
  }
}

/**
 * 새 주문 알림음 "띵동": 미 → 0.3초 뒤 도. 두 음이 겹쳐 울리다가 0.95초에 함께 딱 끊긴다.
 * 소리 파일 없이 Web Audio 로 합성한다 (배음 세기·감쇠는 매장 알림음 녹음을 분석해 맞춤).
 */
function playDing(ctx: AudioContext) {
  const t = ctx.currentTime + 0.05;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.28, t);
  master.gain.setValueAtTime(0.28, t + 0.95);
  master.gain.linearRampToValueAtTime(0, t + 1.05);
  strike(ctx, master, 659, t, [[1, 0.5, 25], [4, 0.71, 39], [16, 0.012, 45]]); // E5 띵
  strike(ctx, master, 523, t + 0.3, [[1, 0.63, 25], [4, 1, 33], [16, 0.056, 50]]); // C5 동
}

/** 띵동이 끝난 뒤 안내 멘트. 여러 건이 한꺼번에 들어오면 한 번에 묶어 말한다. */
function announce(count: number) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(
    count > 1 ? `새 주문 ${count}건이 들어왔습니다` : "새 주문이 들어왔습니다",
  );
  u.lang = "ko-KR";
  u.rate = 1.05;
  speechSynthesis.cancel();
  setTimeout(() => speechSynthesis.speak(u), 1100);
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
  daily_no: number | null;
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

  // 새 주문 알림 — 기본 켜짐, 켜고 끈 설정은 이 기기에 기억한다.
  // 대시보드를 열자마자 소리를 준비한다. 브라우저가 이 사이트의 자동 재생을 허용하면
  // 클릭 없이 바로 울리고, 막혀 있으면 새 주문 때마다 다시 시도하며 화면을 한 번 누르면 풀린다.
  const [soundOn, setSoundOn] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);
  /** 이미 본 결제완료 주문 id — 여기 없는 결제완료 주문이 새 주문이다 */
  const seenPaid = useRef<Set<number> | null>(null);
  const seededRange = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("qp_order_sound") === "off") setSoundOn(false);
    } catch {
      // 저장소를 못 쓰는 환경이면 기본값(켜짐) 그대로
    }
    audioRef.current ??= new AudioContext();
    const unlock = () => void audioRef.current?.resume().catch(() => {});
    unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try {
      localStorage.setItem("qp_order_sound", next ? "on" : "off");
    } catch {
      // 기억만 못 할 뿐 이번 화면에서는 그대로 동작
    }
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
    const ctx = audioRef.current;
    if (fresh.length > 0 && soundOn && ctx) {
      // 아직 막혀 있으면 한 번 더 풀어 보고, 실제로 재생 가능할 때만 울린다
      // (막힌 채로 예약하면 나중에 클릭하는 순간 뒤늦게 울린다)
      ctx
        .resume()
        .then(() => ctx.state === "running" && playDing(ctx))
        .catch(() => {});
      announce(fresh.length);
    }
  }, [orders, range, soundOn]);

  // 탭 제목에 처리 대기 주문 수 — 다른 탭을 보고 있어도 알 수 있게
  const waitingCount = orders.filter((o) => o.status === "paid").length;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) 새 주문 · /, "");
    document.title = waitingCount > 0 ? `(${waitingCount}) 새 주문 · ${base}` : base;
  }, [waitingCount]);

  // 새 주문이 들어오면 자동으로 반영되도록, 대시보드가 열려있는 동안 주문은 5초마다 부른다.
  // 통계(쿼리 3개)는 주문이 결제·완료·거절로 바뀐 순간 바로, 그 외엔 30초마다만 부른다 —
  // 매번 부르면 DB만 바쁘고, 30초만 기다리면 새 주문이 들어와도 매출 숫자가 늦게 바뀐다.
  // 주문 알림 때문에 탭이 백그라운드여도 계속 부른다.
  // ponytail: 크롬은 5분 넘게 숨겨진 탭의 타이머를 1분 간격으로 늦춘다 — 알림이
  // 늦으면 대시보드를 별도 창으로 띄워 두는 게 확실하다 (푸시 알림은 과한 범위).
  useEffect(() => {
    let cancelled = false;
    let tick = 0;
    /** 결제 이후 주문들의 id:상태 — 이게 바뀌면 매출·인기 메뉴도 바뀐 것 */
    let lastSig: string | null = null;

    const fetchStats = () =>
      fetch(`/api/stores/${storeId}/stats?range=${range}d`).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("stats " + r.status)),
      );

    const load = () => {
      const withStats = tick++ % 6 === 0; // 변화가 없어도 5초 × 6 = 30초마다는 통계
      Promise.all([
        withStats ? fetchStats() : null,
        fetch(`/api/stores/${storeId}/orders?range=${range}d`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error("orders " + r.status)),
        ),
      ])
        .then(([s, o]: [Stats | null, { orders: OrderRow[] }]) => {
          if (cancelled) return;
          if (s) setStats(s);
          setOrders(o.orders);
          setError(null);

          const sig = o.orders
            .filter((x) => x.status !== "pending")
            .map((x) => `${x.id}:${x.status}`)
            .join(",");
          if (lastSig !== null && sig !== lastSig && !withStats) {
            fetchStats()
              .then((fresh: Stats) => !cancelled && setStats(fresh))
              .catch(() => {}); // 다음 30초 주기에 다시 시도된다
          }
          lastSig = sig;
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
    const target = orders.find((o) => o.id === orderId);
    const label = target ? orderNoLabel(target) : `#${orderId}`;
    if (status === "rejected" && !confirm(`주문 ${label}을(를) 거절할까요?`)) {
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
          {soundOn ? "🔔 주문 알림 켜짐" : "🔕 주문 알림 꺼짐"}
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
                    {orderNoLabel(o)} · 테이블 {o.table_number ?? "-"}
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
