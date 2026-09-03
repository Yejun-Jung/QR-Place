import { NextRequest, NextResponse } from "next/server";
import { cancelOrder } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/orders/[orderId]/cancel
 * 결제 페이지에서 뒤로가기 등으로 결제를 포기했을 때 호출.
 * 'pending' 상태인 주문(+항목)을 완전히 삭제한다 — 기록을 안 남긴다.
 * 이미 결제됐거나 없는 주문이면 조용히 무시(멱등, 404 아님).
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
    await cancelOrder(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST cancel failed", err);
    return NextResponse.json({ error: "cancel failed" }, { status: 500 });
  }
}
