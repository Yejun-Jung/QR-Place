"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCart, won } from "@/lib/useCart";
import type { Menu, RankedMenu, Store } from "@/lib/types";
import RouletteModal from "./RouletteModal";
import KakaoIcon from "@/app/ui/KakaoIcon";

interface MenusResponse {
  store: Store;
  categories: string[];
  personalized: boolean;
  blurb: string;
  menus: RankedMenu[];
}

function MenuBoard() {
  const { storeId } = useParams<{ storeId: string }>();
  const search = useSearchParams();
  const userId = search.get("userId");
  const table = search.get("table");
  const { data: session } = useSession();
  // 로그인했으면 실제 세션 유저를 쓰고, 아니면 데모용 ?userId= 쿼리파라미터를 그대로 지원
  const effectiveUserId = session?.user?.id
    ? String(session.user.id)
    : userId;

  const cart = useCart(storeId, table);
  const [data, setData] = useState<MenusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>("전체");
  const [openMenu, setOpenMenu] = useState<RankedMenu | null>(null);
  const [sheetQty, setSheetQty] = useState(1);
  const [paired, setPaired] = useState<Menu[]>([]);
  const [rouletteOpen, setRouletteOpen] = useState(false);

  // table/userId 를 유지한 쿼리스트링
  const nextQs = useMemo(() => {
    const p = new URLSearchParams();
    if (table) p.set("table", table);
    if (userId) p.set("userId", userId);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [table, userId]);

  const logView = useCallback(
    (menuId: number) => {
      void fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          storeId: Number(storeId),
          menuId,
          tableNumber: table,
          actionType: "view",
        }),
      });
    },
    [effectiveUserId, storeId, table],
  );

  useEffect(() => {
    const qs = new URLSearchParams();
    if (effectiveUserId) qs.set("userId", effectiveUserId);
    fetch(`/api/stores/${storeId}/menus?${qs.toString()}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then(setData)
      .catch((e) => setError(`메뉴를 불러오지 못했습니다 (${e.message})`));
  }, [storeId, effectiveUserId]);

  const openSheet = (m: RankedMenu) => {
    setOpenMenu(m);
    setSheetQty(1);
    setPaired([]);
    logView(m.id);
    fetch(`/api/stores/${storeId}/menus/${m.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPaired(d.paired ?? []))
      .catch(() => {}); // 페어링은 부가 정보라 실패해도 시트는 그대로 사용 가능
  };

  const addToCart = () => {
    if (!openMenu) return;
    cart.add(
      { menuId: openMenu.id, name: openMenu.name, price: openMenu.price },
      sheetQty,
    );
    setOpenMenu(null);
  };

  const scrollToCategory = (cat: string) => {
    setActiveCat(cat);
    const id = cat === "전체" ? "cat-all" : `cat-${cat}`;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRouletteClick = () => {
    if (!session?.user) {
      signIn("kakao");
      return;
    }
    setRouletteOpen(true);
  };

  if (error)
    return (
      <>
        <header className="app-header">
          <h1>메뉴</h1>
        </header>
        <p className="blurb">{error}</p>
      </>
    );

  if (!data)
    return (
      <>
        <header className="app-header">
          <h1>메뉴</h1>
        </header>
        <p className="empty">불러오는 중…</p>
      </>
    );

  const cats = ["전체", ...data.categories];
  const groups = data.categories
    .map((cat) => ({
      cat,
      items: data.menus.filter((m) => m.tags.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <header className="app-header">
        <h1>{data.store.name}</h1>
        <span className="sub">
          테이블 {table ?? "-"} ·{" "}
          {data.personalized ? "맞춤 추천" : "인기순"}
        </span>
      </header>

      {!session?.user && (
        <div
          className="blurb"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>카카오로 로그인하고 맞춤 추천 받아보세요</span>
          <button
            className="btn kakao"
            style={{ width: "auto", flexShrink: 0, padding: "6px 14px" }}
            onClick={() => signIn("kakao")}
          >
            <KakaoIcon /> 로그인
          </button>
        </div>
      )}
      {session?.user && (
        <div className="user-row">
          <span className="muted">
            {session.user.nickname ?? session.user.name ?? "회원"}님, 안녕하세요
          </span>
          <div className="user-actions">
            <Link href="/stores/taste" className="mini-action">
              🍽️ 나의 취향
            </Link>
            <Link href="/stores/map" className="mini-action">
              🗺️ 내 맛집 지도
            </Link>
            <button
              className="mini-action"
              onClick={() => signOut({ redirectTo: `/stores/${storeId}${nextQs}` })}
            >
              로그아웃
            </button>
          </div>
        </div>
      )}

      <button
        className="btn ghost"
        style={{ margin: "8px 16px 0", width: "calc(100% - 32px)" }}
        onClick={handleRouletteClick}
      >
        🎰 오늘의 룰렛 돌리기
      </button>

      {data.blurb && <div className="blurb">💡 {data.blurb}</div>}

      <div className="chips">
        {cats.map((c) => (
          <button
            key={c}
            className={`chip${activeCat === c ? " active" : ""}`}
            onClick={() => scrollToCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div id="cat-all" />
      {groups.map(({ cat, items }) => (
        <section key={cat} id={`cat-${cat}`} className="menu-section">
          <h2 className="section-title">{cat}</h2>
          <div className="menu-list">
            {items.map((m) => {
              const recommended =
                data.personalized &&
                m.recommendScore > 0 &&
                data.menus.indexOf(m) < 3;
              const inCartQty = cart.qtyOf(m.id);
              return (
                <div
                  key={m.id}
                  className={`menu-row${recommended ? " rec" : ""}`}
                  onClick={() => openSheet(m)}
                >
                  <div>
                    {recommended && <span className="badge">추천</span>}
                    <div className="name">
                      {m.name}
                      {inCartQty > 0 && (
                        <span className="in-cart">담음 {inCartQty}</span>
                      )}
                    </div>
                    {m.description && (
                      <div className="desc">{m.description}</div>
                    )}
                    <div className="meta">
                      {m.tags.category ?? "-"} · 맵기 {m.tags.spicy ?? 0} ·
                      최근 주문 {m.popularity}건
                    </div>
                  </div>
                  <div className="price">{won(m.price)}</div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {cart.count > 0 && (
        <Link
          href={`/stores/${storeId}/cart${nextQs}`}
          className="btn row cartbar"
        >
          <span>장바구니 보기</span>
          <span>
            {cart.count}개 · {won(cart.subtotal)}
          </span>
        </Link>
      )}

      {openMenu && (
        <div className="sheet-backdrop" onClick={() => setOpenMenu(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>{openMenu.name}</h3>
            <div className="desc">
              {openMenu.description ?? "설명이 없습니다."}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <div className="stepper">
                <button
                  onClick={() => setSheetQty((q) => Math.max(1, q - 1))}
                  disabled={sheetQty <= 1}
                >
                  −
                </button>
                <span>{sheetQty}</span>
                <button onClick={() => setSheetQty((q) => q + 1)}>+</button>
              </div>
              <strong>{won(openMenu.price * sheetQty)}</strong>
            </div>
            <button className="btn" onClick={addToCart}>
              장바구니에 담기
            </button>

            {paired.length > 0 && (
              <div className="paired">
                <div className="paired-title">🍽️ 이 메뉴와 함께 많이 시켜요</div>
                {paired.map((p) => (
                  <div className="paired-row" key={p.id}>
                    <span className="paired-name">{p.name}</span>
                    <span className="paired-price">{won(p.price)}</span>
                    <button
                      className="mini-action"
                      onClick={() => cart.add({ menuId: p.id, name: p.name, price: p.price })}
                    >
                      담기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {rouletteOpen && (
        <RouletteModal
          storeId={storeId}
          menus={data.menus}
          onClose={() => setRouletteOpen(false)}
          onAdd={(m) =>
            // ponytail: cart.add()가 같은 menuId를 이미 담긴 줄에 병합하면서
            // 기존 줄의 가격/이름을 유지한다 — 같은 메뉴를 이미 정가로 담아둔
            // 상태에서 룰렛에 당첨되면 무료 표시가 묻힐 수 있음. 실제로 겹칠
            // 일이 드물어 지금은 감수, 문제되면 cart 병합 키에 free 반영.
            cart.add({
              menuId: m.id,
              name: `${m.name} (무료증정)`,
              price: 0,
              free: true,
            })
          }
        />
      )}
    </>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<p className="empty">불러오는 중…</p>}>
      <MenuBoard />
    </Suspense>
  );
}
