import { NextRequest, NextResponse } from "next/server";
import { listOrders, parseRangeDays } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/stores/[storeId]/orders?range=7d → 점주용 주문 목록 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const id = Number(storeId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid storeId" }, { status: 400 });
  }
  const days = parseRangeDays(new URL(req.url).searchParams.get("range"), 7);

  try {
    const orders = await listOrders(id, days, 100);
    return NextResponse.json({ storeId: id, rangeDays: days, orders });
  } catch (err) {
    console.error("GET orders failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
