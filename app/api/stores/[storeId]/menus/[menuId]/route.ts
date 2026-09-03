import { NextRequest, NextResponse } from "next/server";
import { deleteMenu, getPairedMenus, updateMenu } from "@/lib/db";
import type { MenuInput, MenuTags } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stores/[storeId]/menus/[menuId] → 함께 자주 주문된 메뉴 (페어링 추천)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ menuId: string }> },
) {
  const { menuId: menuIdRaw } = await params;
  const menuId = Number(menuIdRaw);
  if (!Number.isFinite(menuId)) {
    return NextResponse.json({ error: "invalid menuId" }, { status: 400 });
  }

  try {
    const paired = await getPairedMenus(menuId, 3);
    return NextResponse.json({ paired });
  } catch (err) {
    console.error("GET /api/stores/[storeId]/menus/[menuId] failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}

/**
 * PUT /api/stores/[storeId]/menus/[menuId]
 * body: { name, price, description?, tags? } → 메뉴 수정 (점주용)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; menuId: string }> },
) {
  const { menuId: menuIdRaw } = await params;
  const menuId = Number(menuIdRaw);
  if (!Number.isFinite(menuId)) {
    return NextResponse.json({ error: "invalid menuId" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = Number(body.price);
  if (!name || !Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "name and non-negative price are required" },
      { status: 400 },
    );
  }

  const input: MenuInput = {
    name,
    price,
    description:
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null,
    tags: (body.tags && typeof body.tags === "object" ? body.tags : {}) as MenuTags,
  };

  try {
    const menu = await updateMenu(menuId, input);
    if (!menu) {
      return NextResponse.json({ error: "menu not found" }, { status: 404 });
    }
    return NextResponse.json({ menu });
  } catch (err) {
    console.error("PUT /api/stores/[storeId]/menus/[menuId] failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}

/**
 * DELETE /api/stores/[storeId]/menus/[menuId] → 메뉴 삭제 (점주용)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; menuId: string }> },
) {
  const { menuId: menuIdRaw } = await params;
  const menuId = Number(menuIdRaw);
  if (!Number.isFinite(menuId)) {
    return NextResponse.json({ error: "invalid menuId" }, { status: 400 });
  }

  try {
    await deleteMenu(menuId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/stores/[storeId]/menus/[menuId] failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
