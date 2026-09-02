import { NextRequest, NextResponse } from "next/server";
import { insertViewLog } from "@/lib/db";
import type { ActionType } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/logs
 * body: { userId?, storeId, menuId, tableNumber?, actionType }
 * → 조회/주문 로그 적재 (스펙 5)
 *
 * 비로그인(userId 없음)도 로그는 남긴다. 개인화에는 안 쓰이지만
 * 인기 메뉴 집계(콜드 스타트)에는 사용된다.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const storeId = Number(body.storeId);
  const menuId = Number(body.menuId);
  const actionType = body.actionType as ActionType;

  if (!Number.isFinite(storeId) || !Number.isFinite(menuId)) {
    return NextResponse.json(
      { error: "storeId, menuId are required numbers" },
      { status: 400 },
    );
  }
  if (actionType !== "view" && actionType !== "order") {
    return NextResponse.json(
      { error: "actionType must be 'view' or 'order'" },
      { status: 400 },
    );
  }

  const userId =
    body.userId == null || body.userId === "" ? null : Number(body.userId);
  const tableNumber =
    body.tableNumber == null ? null : String(body.tableNumber);

  try {
    const log = await insertViewLog({
      userId: Number.isFinite(userId as number) ? (userId as number) : null,
      tableNumber,
      storeId,
      menuId,
      actionType,
    });
    return NextResponse.json({ ok: true, log }, { status: 201 });
  } catch (err) {
    console.error("POST /api/logs failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
