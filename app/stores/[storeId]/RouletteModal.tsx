"use client";

import { useEffect, useState } from "react";
import { pickRoulette } from "@/lib/recommend";
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

/**
 * 메뉴판 상위 추천 N개 중 랜덤 1개를 슬롯머신처럼 뽑아 보여주는 룰렛 이벤트 모달.
 * 실제 당첨 결과는 lib/recommend.ts의 pickRoulette()가 그대로 정하고,
 * 여기서는 그 결과를 감속 애니메이션으로 연출만 한다.
 */
export default function RouletteModal({
  menus,
  onClose,
  onAdd,
}: {
  menus: RankedMenu[];
  onClose: () => void;
  onAdd: (menu: RankedMenu) => void;
}) {
  const pool = menus.slice(0, POOL_SIZE);
  const [spinning, setSpinning] = useState(true);
  const [displayed, setDisplayed] = useState<RankedMenu | null>(
    pool[0] ?? null,
  );
  const [winner, setWinner] = useState<RankedMenu | null>(null);

  const spin = () => {
    if (pool.length === 0) return;
    setWinner(null);
    setSpinning(true);
    const picked = pickRoulette(pool, pool.length);

    let i = 0;
    const step = () => {
      setDisplayed(pool[i % pool.length]);
      i++;
      if (i < TICK_COUNT) {
        setTimeout(step, tickDelay(i));
      } else {
        setDisplayed(picked);
        setWinner(picked);
        setSpinning(false);
      }
    };
    step();
  };

  // 모달이 열리면 바로 한 번 돌린다
  useEffect(() => {
    spin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pool.length === 0) {
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <p className="empty">뽑을 메뉴가 아직 없어요.</p>
          <button className="btn ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet roulette" onClick={(e) => e.stopPropagation()}>
        <h3>🎰 오늘의 룰렛</h3>

        <div className={`roulette-slot${spinning ? " spinning" : ""}`}>
          {displayed?.name}
        </div>

        {winner && (
          <>
            <p className="desc" style={{ textAlign: "center" }}>
              당첨! {won(winner.price)}
            </p>
            <button
              className="btn"
              onClick={() => {
                onAdd(winner);
                onClose();
              }}
            >
              장바구니에 담기
            </button>
            <button
              className="btn ghost"
              style={{ marginTop: 8 }}
              onClick={spin}
            >
              다시 돌리기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
