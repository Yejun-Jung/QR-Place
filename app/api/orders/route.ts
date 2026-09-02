import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/orders
 * body: { storeId, tableNumber?, userId?, items: [{ menuId, quantity }] }
 * → 'pending' 주문 생성. 가격/이름은 서버에서 DB 기준으로 스냅샷 (위조 방지).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const storeId = Number(body.storeId);
  const items = Array.isArray(body.items) ? body.items : [];
  if (!Number.isFinite(storeId) || items.length === 0) {
    return NextResponse.json(
      { error: "storeId and non-empty items are required" },
      { status: 400 },
    );
  }

  const normalizedItems = items
    .map((it) => {
      const rec = it as Record<string, unknown>;
      return { menuId: Number(rec.menuId), quantity: Number(rec.quantity) };
    })
    .filter((it) => Number.isFinite(it.menuId) && it.quantity > 0);

  if (normalizedItems.length === 0) {
    return NextResponse.json({ error: "no valid items" }, { status: 400 });
  }

  const userId =
    body.userId == null || body.userId === "" ? null : Number(body.userId);

  try {
    const order = await createOrder({
      storeId,
      userId: Number.isFinite(userId as number) ? (userId as number) : null,
      tableNumber: body.tableNumber == null ? null : String(body.tableNumber),
      items: normalizedItems,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error("POST /api/orders failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "db error" },
      { status: 500 },
    );
  }
}
