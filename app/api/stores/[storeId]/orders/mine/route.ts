import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GUEST_COOKIE } from "@/lib/authz";
import { listCustomerOrders, parseRangeDays } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stores/[storeId]/orders/mine?range=7d
 * 손님이 보는 "내 주문 기록".
 *
 * 매장 전체 주문을 주는 점주용(/orders)과 달리, 여기서는 **이 휴대폰에서 넣은
 * 주문**(주문 때 발급한 쿠키)과 (로그인했다면) **본인 주문**만 준다.
 * 같은 테이블이라도 다른 사람 휴대폰의 주문은 보이지 않는다.
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
  const days = parseRangeDays(url.searchParams.get("range"), 7);

  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    const guestToken = req.cookies.get(GUEST_COOKIE)?.value ?? null;
    const orders = await listCustomerOrders(id, guestToken, userId, days);
    return NextResponse.json({ storeId: id, orders });
  } catch (err) {
    console.error("GET my orders failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
