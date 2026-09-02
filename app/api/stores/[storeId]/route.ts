import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/stores/[storeId] → 매장 기본 정보 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const id = Number(storeId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid storeId" }, { status: 400 });
  }
  const store = await getStore(id);
  if (!store) {
    return NextResponse.json({ error: "store not found" }, { status: 404 });
  }
  return NextResponse.json({ store });
}
