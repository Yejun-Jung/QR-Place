"use client";

import { useEffect, useRef } from "react";

/** 점주 처리를 기다리는 동안 — 체감상 "바로" 반영되는 간격 */
const FAST_MS = 2500;
/** 기다릴 게 없을 때 — 배터리·요청 수 아끼기 */
const IDLE_MS = 15000;

/**
 * 주문 상태처럼 "기다리는 동안만 자주 확인하면 되는" 값을 위한 폴링.
 *
 * check() 가 true(아직 기다리는 중)를 주면 2.5초 뒤, false 면 15초 뒤에 다시 부른다.
 * 탭이 백그라운드면 요청하지 않고, 화면에 돌아오는 순간 즉시 한 번 확인한다.
 *
 * ponytail: Vercel 서버리스라 WebSocket 을 띄울 수 없어서 폴링으로 간다.
 * 진짜 푸시가 필요해지면 SSE(스트리밍 라우트)나 외부 실시간 서비스로 교체.
 */
export function usePolling(check: () => Promise<boolean>, deps: unknown[]) {
  // 최신 check 를 항상 보도록 ref 로 들고 있는다 (매 렌더 새 함수라 deps 에 못 넣는다)
  const checkRef = useRef(check);
  checkRef.current = check;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      if (cancelled) return;
      if (document.hidden) {
        timer = setTimeout(run, IDLE_MS);
        return;
      }
      let waiting = false;
      try {
        waiting = await checkRef.current();
      } catch {
        /* 폴링 실패는 조용히 넘긴다 — 다음 차례에 다시 시도 */
      }
      if (cancelled) return;
      timer = setTimeout(run, waiting ? FAST_MS : IDLE_MS);
    };

    const onVisible = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      void run();
    };

    void run();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
