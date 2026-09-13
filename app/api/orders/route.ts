import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createOrder, getTodaySpin, redeemSpin } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/orders
 * body: { storeId, tableNumber?, userId?, items: [{ menuId, quantity }] }
 * → 'pending' 주문 생성. 가격/이름은 서버에서 DB 기준으로 스냅샷 (위조 방지).
 * userId 는 로그인 세션이 있으면 세션 값을 우선하고, 없으면 body 의 값(데모용
 * ?userId= 흐름)으로 폴백한다.
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
      return {
        menuId: Number(rec.menuId),
        quantity: Number(rec.quantity),
        free: Boolean(rec.free),
      };
    })
    .filter((it) => Number.isFinite(it.menuId) && it.quantity > 0);

  if (normalizedItems.length === 0) {
    return NextResponse.json({ error: "no valid items" }, { status: 400 });
  }

  const session = await auth();
  const bodyUserId =
    body.userId == null || body.userId === "" ? null : Number(body.userId);
  const userId =
    session?.user?.id ??
    (Number.isFinite(bodyUserId as number) ? (bodyUserId as number) : null);

  // 0원 처리되는 free 항목은 클라이언트 말만 믿으면 안 된다 — 오늘 이 매장에서
  // 실제로 "추천 메뉴 무료 증정"에 당첨된 기록(roulette_spins)과 대조한다.
  const freeItems = normalizedItems.filter((it) => it.free);
  let spinToRedeem: number | null = null;
  if (freeItems.length > 0) {
    const spin = userId ? await getTodaySpin(userId, storeId) : null;
    const eligible =
      spin != null &&
      spin.prize_kind === "menu" &&
      spin.redeemed_at == null &&
      freeItems.length === 1 &&
      freeItems[0].menuId === spin.prize_menu_id &&
      freeItems[0].quantity === 1;
    if (!eligible) {
      return NextResponse.json(
        { error: "무료 증정 대상이 아닙니다 (룰렛 당첨 기록 없음)" },
        { status: 403 },
      );
    }
    spinToRedeem = spin.id;
  }

  try {
    const order = await createOrder({
      storeId,
      userId,
      tableNumber: body.tableNumber == null ? null : String(body.tableNumber),
      items: normalizedItems,
    });
    // 주문이 실제로 만들어진 뒤에 당첨을 소진 처리 (같은 당첨 재사용 방지)
    if (spinToRedeem != null) await redeemSpin(spinToRedeem);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error("POST /api/orders failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "db error" },
      { status: 500 },
    );
  }
}
