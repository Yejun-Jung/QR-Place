import { NextRequest, NextResponse } from "next/server";
import { getOrder, setOrderStatus } from "@/lib/db";
import { denyUnlessStoreOwner } from "@/lib/authz";
import { HANDLED_STATUSES, type HandledStatus } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/orders/[orderId]/status
 * body: { status: 'served' | 'rejected' }
 *
 * 점주가 결제된 주문을 접수(준비 완료) 하거나 거절한다. 그 매장 점주만 가능.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const id = Number(orderId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid orderId" }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* 아래에서 status 검증에 걸린다 */
  }
  const status = String(body.status ?? "") as HandledStatus;
  if (!HANDLED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of ${HANDLED_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const order = await getOrder(id);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  // 주문이 속한 매장의 점주인지 확인
  const denied = await denyUnlessStoreOwner(order.store_id);
  if (denied) return denied;

  try {
    const updated = await setOrderStatus(id, status);
    return NextResponse.json({ ok: true, order: updated });
  } catch (err) {
    console.error("POST order status failed", err);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
