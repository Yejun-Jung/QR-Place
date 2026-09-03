import { auth } from "@/auth";
import AppHeader from "@/app/ui/AppHeader";
import KakaoLoginCard from "@/app/ui/KakaoLoginCard";
import { getUserRecentLogs } from "@/lib/db";
import { computeTagWeights, describeTopTag, topTags } from "@/lib/recommend";
import TasteChart from "./TasteChart";

const WINDOW_DAYS = 30;

/** 로그인 유저의 최근 활동(view_logs)을 태그 가중치로 집계해 보여주는
 * "나의 취향 리포트" — 기존 추천 알고리즘(recommend.ts)을 그대로 재사용,
 * 매장 하나가 아니라 유저가 지금까지 둘러본 모든 매장을 합산한다. */
export default async function TastePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <>
        <AppHeader title="나의 취향 리포트" />
        <KakaoLoginCard
          message="카카오 계정으로 로그인하면 최근 취향을 분석해서 보여드려요."
          redirectTo="/stores/taste"
        />
      </>
    );
  }

  const logs = await getUserRecentLogs(session.user.id, WINDOW_DAYS, 200);

  if (logs.length === 0) {
    return (
      <>
        <AppHeader title="나의 취향 리포트" />
        <p className="empty">
          아직 분석할 활동이 없어요.
          <br />
          매장에서 메뉴를 둘러보면 취향이 여기 쌓여요.
        </p>
      </>
    );
  }

  const weights = computeTagWeights(logs);
  const headline = describeTopTag(topTags(weights, 1)[0]);
  const categories = [...weights.entries()]
    .filter(([token]) => token.startsWith("category:"))
    .map(([token, w]): [string, number] => [
      token.slice("category:".length),
      w,
    ])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <>
      <AppHeader title="나의 취향 리포트" sub={`최근 ${WINDOW_DAYS}일`} />
      <div className="blurb">💡 {headline}</div>
      {categories.length > 0 && (
        <>
          <h2 className="section-title">관심 카테고리</h2>
          <TasteChart categories={categories} />
        </>
      )}
    </>
  );
}
