/**
 * 스펙 7 (선택): 룰 기반 결과 위에 얹는 자연어 추천 문구.
 *
 * 지금은 LLM 없이 규칙으로 생성한다. 나중에 OpenAI/Claude 등을 붙이려면
 * generateBlurb 만 async 로 바꿔 topTags 를 프롬프트에 넣으면 된다.
 * (추천 순위 자체는 룰 기반 유지)
 */
import type { RankedMenu } from "./types";
import { computeTagWeights, topTags } from "./recommend";
import type { LogEntry } from "./types";

export function generateBlurb(ranked: RankedMenu[], logs: LogEntry[]): string {
  const top = ranked[0];
  if (!top) return "메뉴를 둘러보세요!";

  const personalized = top.recommendScore > 0;
  if (!personalized) {
    return `요즘 여기서 가장 많이 시키는 메뉴는 "${top.name}"이에요.`;
  }

  const tokens = topTags(computeTagWeights(logs), 3);
  const spicy = tokens.some((t) => t.startsWith("spicy:") && Number(t.split(":")[1]) >= 3);
  const category = tokens.find((t) => t.startsWith("category:"))?.split(":")[1];

  const hints: string[] = [];
  if (spicy) hints.push("매콤한 걸 즐겨 드시던데");
  if (category) hints.push(`${category} 종류를 자주 보셨어요`);

  const prefix = hints.length ? `${hints.join(", ")}, ` : "";
  return `${prefix}오늘은 "${top.name}" 어때요?`;
}
