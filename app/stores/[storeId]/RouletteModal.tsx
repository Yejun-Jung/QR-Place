"use client";

import { useEffect, useState } from "react";
import {
  pickRoulette,
  pickRoulettePrize,
  ROULETTE_PRIZES,
} from "@/lib/recommend";
import type { RoulettePrize } from "@/lib/recommend";
import { won } from "@/lib/useCart";
import type { RankedMenu } from "@/lib/types";

const POOL_SIZE = 3;
const TICK_COUNT = 14;
const TICK_MIN_MS = 80;
const TICK_MAX_MS = 650;

/** i번째 틱까지의 간격(ms) — 슬롯이 점점 느려지다 멈추는 감속 연출용 */
function tickDelay(i: number) {
  const t = i / (TICK_COUNT - 1);
  return Math.round(TICK_MIN_MS + (TICK_MAX_MS - TICK_MIN_MS) * t * t);
}

type Status = "checking" | "denied" | "spinning" | "result";

/**
 * 룰렛 이벤트 모달. 열리면 먼저 서버에 스핀 가능 여부를 확인(+기록)하고,
 * 허용되면 4개 고정 상품 중 하나를 pickRoulettePrize()로 뽑아 슬롯머신
 * 애니메이션으로 연출한다. "추천 메뉴" 당첨 시에만 pickRoulette()으로
 * 상위 추천 메뉴 중 하나를 골라 장바구니에 담을 수 있다.
 */
export default function RouletteModal({
  storeId,
  menus,
  onClose,
  onAdd,
}: {
  storeId: string | number;
  menus: RankedMenu[];
  onClose: () => void;
  onAdd: (menu: RankedMenu) => void;
}) {
  const pool = menus.slice(0, POOL_SIZE);
  const [status, setStatus] = useState<Status>("checking");
  const [deniedReason, setDeniedReason] = useState<string | null>(null);
  const [displayedLabel, setDisplayedLabel] = useState(
    ROULETTE_PRIZES[0].label,
  );
  const [prize, setPrize] = useState<RoulettePrize | null>(null);
  const [wonMenu, setWonMenu] = useState<RankedMenu | null>(null);

  const spin = () => {
    setStatus("spinning");
    setPrize(null);
    setWonMenu(null);
    const picked = pickRoulettePrize();
    const pickedMenu =
      picked.kind === "menu" ? pickRoulette(pool, pool.length) : null;

    let i = 0;
    const step = () => {
      setDisplayedLabel(ROULETTE_PRIZES[i % ROULETTE_PRIZES.length].label);
      i++;
      if (i < TICK_COUNT) {
        setTimeout(step, tickDelay(i));
      } else {
        setDisplayedLabel(picked.label);
        setPrize(picked);
        setWonMenu(pickedMenu);
        setStatus("result");
      }
    };
    step();
  };

  // 모달이 열리면 먼저 "오늘 돌려도 되는지" 서버에 확인+기록부터 한다.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stores/${storeId}/roulette`, { method: "POST" })
      .then(async (r) => {
        if (cancelled) return;
        if (r.ok) {
          spin();
          return;
        }
        const body = await r.json().catch(() => ({}) as { error?: string });
        setDeniedReason(body.error ?? "룰렛을 돌릴 수 없어요.");
        setStatus("denied");
      })
      .catch(() => {
        if (cancelled) return;
        setDeniedReason("네트워크 오류로 룰렛을 돌릴 수 없어요.");
        setStatus("denied");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet roulette" onClick={(e) => e.stopPropagation()}>
        <h3>🎰 오늘의 룰렛</h3>

        {status === "checking" && <p className="empty">확인 중…</p>}

        {status === "denied" && (
          <>
            <p className="blurb">{deniedReason}</p>
            <button className="btn ghost" onClick={onClose}>
              닫기
            </button>
          </>
        )}

        {(status === "spinning" || status === "result") && (
          <div
            className={`roulette-slot${status === "spinning" ? " spinning" : ""}`}
          >
            {displayedLabel}
          </div>
        )}

        {status === "result" && prize && (
          <>
            {prize.kind === "menu" && wonMenu ? (
              <>
                <p className="desc" style={{ textAlign: "center" }}>
                  당첨! {wonMenu.name} · {won(wonMenu.price)}
                </p>
                <button
                  className="btn"
                  onClick={() => {
                    onAdd(wonMenu);
                    onClose();
                  }}
                >
                  장바구니에 담기
                </button>
              </>
            ) : prize.kind === "miss" ? (
              <p className="desc" style={{ textAlign: "center" }}>
                다음 기회에 다시 도전해주세요!
              </p>
            ) : (
              <p className="desc" style={{ textAlign: "center" }}>
                이 화면을 직원에게 보여주세요.
              </p>
            )}
            <button
              className="btn ghost"
              style={{ marginTop: 8 }}
              onClick={onClose}
            >
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
