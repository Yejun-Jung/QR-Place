import { NextRequest, NextResponse } from "next/server";
import {
  getDailyVisitors,
  getPopularMenus,
  getRevenueByDay,
  parseRangeDays,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stores/[storeId]/stats?range=7d
 * → 점주 대시보드용 일별 방문자 / 인기 메뉴 통계 (스펙 4-3, 5)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId: storeIdRaw } = await params;
  const storeId = Number(storeIdRaw);
  if (!Number.isFinite(storeId)) {
    return NextResponse.json({ error: "invalid storeId" }, { status: 400 });
  }

  const url = new URL(req.url);
  const days = parseRangeDays(url.searchParams.get("range"), 7);

  try {
    const [dailyVisitors, popularMenus, revenueByDay] = await Promise.all([
      getDailyVisitors(storeId, days),
      getPopularMenus(storeId, days, 10),
      getRevenueByDay(storeId, days),
    ]);

    const totalRevenue = revenueByDay.reduce((s, r) => s + r.revenue, 0);
    const totalOrders = revenueByDay.reduce((s, r) => s + r.orders, 0);

    return NextResponse.json({
      storeId,
      rangeDays: days,
      dailyVisitors,
      popularMenus,
      revenueByDay,
      totalRevenue,
      totalOrders,
    });
  } catch (err) {
    console.error("GET stats failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
