import { NextRequest, NextResponse } from "next/server";
import {
  createMenu,
  getMenuPopularity,
  getStore,
  getStoreMenus,
  getUserRecentLogs,
  parseRangeDays,
} from "@/lib/db";
import { generateBlurb } from "@/lib/blurb";
import { recommendMenus } from "@/lib/recommend";
import type { LogEntry, MenuInput, MenuTags } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stores/[storeId]/menus?userId={optional}&days=30
 *
 * - userId 있음  → 개인화 정렬 (스펙 4-1)
 * - userId 없음  → 매장 인기순 (스펙 4-2 콜드 스타트)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId: storeIdRaw } = await params;
  const storeId = Number(storeIdRaw);
  if (!Number.isFinite(storeId)) {
    return NextResponse.json({ error: "invalid storeId" }, { status: 400 });
  }

  const url = new URL(req.url);
  const userIdRaw = url.searchParams.get("userId");
  const userId = userIdRaw ? Number(userIdRaw) : null;
  const days = parseRangeDays(url.searchParams.get("days"), 30);

  try {
    const [store, menus, popularity] = await Promise.all([
      getStore(storeId),
      getStoreMenus(storeId),
      getMenuPopularity(storeId, days),
    ]);

    if (!store) {
      return NextResponse.json({ error: "store not found" }, { status: 404 });
    }

    let logs: LogEntry[] = [];
    if (userId && Number.isFinite(userId)) {
      logs = await getUserRecentLogs(userId, days, 50);
    }

    const ranked = recommendMenus(menus, logs, popularity);
    const categories = [
      ...new Set(
        menus.map((m) => m.tags.category).filter((c): c is string => !!c),
      ),
    ];

    return NextResponse.json({
      storeId,
      store,
      categories,
      personalized: logs.length > 0,
      windowDays: days,
      blurb: generateBlurb(ranked, logs),
      menus: ranked,
    });
  } catch (err) {
    console.error("GET menus failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}

/**
 * POST /api/stores/[storeId]/menus
 * body: { name, price, description?, tags? } → 메뉴 생성 (점주용)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId: storeIdRaw } = await params;
  const storeId = Number(storeIdRaw);
  if (!Number.isFinite(storeId)) {
    return NextResponse.json({ error: "invalid storeId" }, { status: 400 });
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
    const store = await getStore(storeId);
    if (!store) {
      return NextResponse.json({ error: "store not found" }, { status: 404 });
    }
    const menu = await createMenu(storeId, input);
    return NextResponse.json({ menu }, { status: 201 });
  } catch (err) {
    console.error("POST /api/stores/[storeId]/menus failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
