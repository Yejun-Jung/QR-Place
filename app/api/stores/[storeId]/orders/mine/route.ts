import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listCustomerOrders, parseRangeDays } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stores/[storeId]/orders/mine?table=A1&range=7d
 * 손님이 보는 "내 주문 기록".
 *
 * 매장 전체 주문을 주는 점주용(/orders)과 달리, 여기서는 **그 테이블의 주문**과
 * (로그인했다면) **본인 주문**만 준다. 테이블 번호를 아는 사람 = 그 테이블 손님으로
 * 보는 건 결제/취소 가드(lib/authz.ts)와 같은 기준이다.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const id = Number(storeId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid storeId" }, { status: 400 });
  }

  const url = new URL(req.url);
  const table = url.searchParams.get("table");
  const days = parseRangeDays(url.searchParams.get("range"), 7);

  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    const orders = await listCustomerOrders(id, table, userId, days);
    return NextResponse.json({ storeId: id, orders });
  } catch (err) {
    console.error("GET my orders failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
