import { NextRequest, NextResponse } from "next/server";
import { payOrder } from "@/lib/db";
import type { PaymentMethod } from "@/lib/types";

export const runtime = "nodejs";

const METHODS: PaymentMethod[] = ["card", "kakaopay", "counter"];

/**
 * POST /api/orders/[orderId]/pay
 * body: { paymentMethod: 'card' | 'kakaopay' | 'counter' }
 *
 * ⚠️ 데모용 모의 결제. 실제 PG(토스페이먼츠/카카오페이) 연동 지점은 여기다.
 *    실제 연동 시: 클라이언트에서 PG SDK로 결제창 → 성공 콜백의 결제키를
 *    이 라우트로 전달 → 서버에서 PG 승인(confirm) API 호출 → 성공 시 payOrder().
 *    지금은 승인 단계를 건너뛰고 바로 'paid' 처리한다.
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

  const method = String(body.paymentMethod ?? "card") as PaymentMethod;
  if (!METHODS.includes(method)) {
    return NextResponse.json(
      { error: `paymentMethod must be one of ${METHODS.join(", ")}` },
      { status: 400 },
    );
  }

  // 결제 게이트웨이 지연 흉내
  await new Promise((r) => setTimeout(r, 600));

  try {
    const order = await payOrder(id, method);
    if (!order) {
      return NextResponse.json({ error: "order not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error("POST pay failed", err);
    return NextResponse.json({ error: "payment failed" }, { status: 500 });
  }
}
