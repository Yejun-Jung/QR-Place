/**
 * 룰 기반 가중치 추천 (스펙 4장).
 *
 * 전부 순수 함수 — DB/네트워크 의존 없음. 테스트 용이.
 */
import type { LogEntry, Menu, MenuTags, RankedMenu } from "./types";

/** 'order' 는 'view' 보다 강한 신호 → 2배 가중치 */
export const ACTION_WEIGHT: Record<LogEntry["action_type"], number> = {
  view: 1,
  order: 2,
};

/** 태그 객체를 비교 가능한 토큰 배열로 변환 ("category:찌개", "spicy:3" …) */
export function tagTokens(tags: MenuTags | null | undefined): string[] {
  if (!tags) return [];
  const tokens: string[] = [];
  if (tags.category != null && tags.category !== "") {
    tokens.push(`category:${tags.category}`);
  }
  if (tags.spicy != null) tokens.push(`spicy:${tags.spicy}`);
  if (tags.price_range != null) tokens.push(`price_range:${tags.price_range}`);
  return tokens;
}

/**
 * 유저의 최근 로그를 합산해 태그별 가중치 맵을 만든다.
 * (스펙 4-1-2)
 */
export function computeTagWeights(logs: LogEntry[]): Map<string, number> {
  const weights = new Map<string, number>();
  for (const log of logs) {
    const w = ACTION_WEIGHT[log.action_type] ?? 1;
    for (const token of tagTokens(log.tags)) {
      weights.set(token, (weights.get(token) ?? 0) + w);
    }
  }
  return weights;
}

/** 가중치 상위 N개 태그 토큰 (스펙 4-1-3) */
export function topTags(weights: Map<string, number>, n = 3): string[] {
  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([token]) => token);
}

export interface RecommendOptions {
  /** 상위 몇 개 태그를 매칭에 쓸지 (기본 3, 스펙 "2~3개") */
  topTagCount?: number;
}

/**
 * 메뉴 목록을 추천 순으로 정렬한다.
 *
 * - 상위 태그와 매칭되는 메뉴가 위로 (recommendScore desc)
 * - 동점이면 매장 인기순(주문 수)으로 (스펙 4-1-5)
 * - logs 가 비어 있으면 모든 recommendScore 가 0 → 순수 인기순 = 콜드 스타트(4-2)
 */
export function recommendMenus(
  menus: Menu[],
  logs: LogEntry[],
  popularity: Map<number, number>,
  options: RecommendOptions = {},
): RankedMenu[] {
  const topTagCount = options.topTagCount ?? 3;
  const weights = computeTagWeights(logs);
  const top = new Set(topTags(weights, topTagCount));

  return menus
    .map((menu): RankedMenu => {
      let recommendScore = 0;
      for (const token of tagTokens(menu.tags)) {
        if (top.has(token)) recommendScore += weights.get(token) ?? 0;
      }
      return {
        ...menu,
        recommendScore,
        popularity: popularity.get(menu.id) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.recommendScore - a.recommendScore ||
        b.popularity - a.popularity ||
        a.id - b.id,
    );
}

/** 콜드 스타트 전용 별칭 — 인기순 정렬 (스펙 4-2) */
export function popularMenus(
  menus: Menu[],
  popularity: Map<number, number>,
): RankedMenu[] {
  return recommendMenus(menus, [], popularity);
}

/**
 * 룰렛 이벤트용 (스펙 7): 추천 상위 N개 중 랜덤 1개.
 * rng 주입 가능 → 테스트 결정적.
 */
export function pickRoulette(
  ranked: RankedMenu[],
  n = 3,
  rng: () => number = Math.random,
): RankedMenu | null {
  const pool = ranked.slice(0, n);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export type RoulettePrizeKind = "miss" | "menu" | "drink" | "discount10";

export interface RoulettePrize {
  kind: RoulettePrizeKind;
  label: string;
  /** 당첨 확률 (합 1) */
  weight: number;
}

/** 룰렛 이벤트 고정 상품 4종 — 꽝이 가장 흔하고, 좋은 혜택일수록 희박해지는 가차 확률 */
export const ROULETTE_PRIZES: RoulettePrize[] = [
  { kind: "miss", label: "꽝", weight: 0.5 },
  { kind: "drink", label: "음료수 서비스", weight: 0.25 },
  { kind: "discount10", label: "총액 10% 할인", weight: 0.15 },
  { kind: "menu", label: "추천 메뉴 무료 증정", weight: 0.1 },
];

/**
 * ROULETTE_PRIZES를 누적 확률 구간으로 나눠 rng 값이 속한 상품을 뽑는다.
 * rng 주입 가능 → 테스트 결정적.
 */
export function pickRoulettePrize(
  rng: () => number = Math.random,
): RoulettePrize {
  const r = rng();
  let acc = 0;
  for (const prize of ROULETTE_PRIZES) {
    acc += prize.weight;
    if (r < acc) return prize;
  }
  return ROULETTE_PRIZES[ROULETTE_PRIZES.length - 1];
}
