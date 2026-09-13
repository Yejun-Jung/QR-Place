import { NextRequest, NextResponse } from "next/server";
import { cancelOrder, getOrder } from "@/lib/db";
import { denyUnlessOrderOwner } from "@/lib/authz";

export const runtime = "nodejs";

/**
 * POST /api/orders/[orderId]/cancel
 * 결제 페이지에서 뒤로가기 등으로 결제를 포기했을 때 호출.
 * 'pending' 상태인 주문(+항목)을 완전히 삭제한다 — 기록을 안 남긴다.
 * 이미 결제됐거나 없는 주문이면 조용히 무시(멱등, 404 아님).
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
    /* body 없어도 됨 */
  }

  // 주문번호만 알면 남의 결제대기 주문을 지울 수 있어서 소유권을 확인한다.
  // 없는 주문은 그대로 성공 처리 — 취소는 멱등해야 뒤로가기를 두 번 눌러도 안전하다.
  const existing = await getOrder(id);
  if (!existing) return NextResponse.json({ ok: true });
  const denied = await denyUnlessOrderOwner(
    existing,
    body.tableNumber == null ? null : String(body.tableNumber),
  );
  if (denied) return denied;

  try {
    await cancelOrder(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST cancel failed", err);
    return NextResponse.json({ error: "cancel failed" }, { status: 500 });
  }
}
