import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createStore } from "@/lib/db";
import type { NewStoreInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stores
 * body: { name, kakaoPlaceId, latitude, longitude } → 매장 등록 (점주용)
 * name/kakaoPlaceId/latitude/longitude 는 카카오 로컬 API 검색 결과에서 채워진다.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const kakaoPlaceId =
    typeof body.kakaoPlaceId === "string" ? body.kakaoPlaceId.trim() : "";
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (
    !name ||
    !kakaoPlaceId ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return NextResponse.json(
      { error: "name, kakaoPlaceId, latitude, longitude are required" },
      { status: 400 },
    );
  }

  const session = await auth();
  const input: NewStoreInput = {
    name,
    kakaoPlaceId,
    latitude,
    longitude,
    ownerUserId: session?.user?.id ?? null,
  };

  try {
    const store = await createStore(input);
    return NextResponse.json({ store }, { status: 201 });
  } catch (err) {
    console.error("POST /api/stores failed", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
