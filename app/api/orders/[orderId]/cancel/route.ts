import { NextRequest, NextResponse } from "next/server";
import { cancelOrder } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/orders/[orderId]/cancel
 * 결제 페이지에서 뒤로가기 등으로 결제를 포기했을 때 호출.
 * 'pending' 상태인 주문만 'cancelled'로 바뀐다 — 이미 결제된 주문은 그대로 둔다.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const id = Number(orderId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid orderId" }, { status: 400 });
  }

  try {
    const order = await cancelOrder(id);
    if (!order) {
      return NextResponse.json({ error: "order not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error("POST cancel failed", err);
    return NextResponse.json({ error: "cancel failed" }, { status: 500 });
  }
}
