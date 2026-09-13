import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getMenuPopularity,
  getStoreMenus,
  getUserRecentLogs,
  hasSpunToday,
  recordSpin,
} from "@/lib/db";
import { pickRoulette, pickRoulettePrize, recommendMenus } from "@/lib/recommend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;
const PRIZE_POOL_SIZE = 3;

/**
 * POST /api/stores/[storeId]/roulette
 * 룰렛 이벤트 스핀. 유저×매장 기준 하루 1회로 제한한다. 로그인 필수.
 *
 * 당첨 상품은 **서버가 뽑아서 DB에 기록**한다 — 클라이언트가 정하면 devtools로
 * "추천 메뉴 무료 증정"을 얼마든지 자작할 수 있기 때문. 주문 생성 시
 * (POST /api/orders) 여기 남긴 기록과 대조해야 0원 항목이 통과된다.
 * 응답의 prize/menu 는 연출용이고, 신뢰의 근거는 어디까지나 DB 기록이다.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const id = Number(storeId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid storeId" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const userId = session.user.id;

  const alreadySpun = await hasSpunToday(userId, id);
  if (alreadySpun) {
    return NextResponse.json(
      { error: "오늘은 이미 룰렛을 돌리셨어요. 내일 다시 와주세요!" },
      { status: 409 },
    );
  }

  const prize = pickRoulettePrize();

  // "추천 메뉴 무료 증정"이면 어떤 메뉴인지도 서버가 정한다 (추천 상위 3개 중 랜덤).
  let menu = null;
  if (prize.kind === "menu") {
    const [menus, popularity, logs] = await Promise.all([
      getStoreMenus(id),
      getMenuPopularity(id, WINDOW_DAYS),
      getUserRecentLogs(userId, WINDOW_DAYS, 50),
    ]);
    menu = pickRoulette(recommendMenus(menus, logs, popularity), PRIZE_POOL_SIZE);
  }

  await recordSpin(userId, id, { kind: prize.kind, menuId: menu?.id ?? null });
  return NextResponse.json({ prize, menu }, { status: 201 });
}
