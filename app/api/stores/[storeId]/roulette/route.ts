import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasSpunToday, recordSpin } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stores/[storeId]/roulette
 * 룰렛 이벤트 스핀 시도. 유저×매장 기준 하루 1회로 제한한다.
 * 로그인 필수 — 어떤 상품이 나올지는 클라이언트가 결정(연출/장바구니 담기용),
 * 여기서는 "오늘 돌려도 되는지"만 원자적으로 확인+기록한다.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const id = Number(storeId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid storeId" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const alreadySpun = await hasSpunToday(session.user.id, id);
  if (alreadySpun) {
    return NextResponse.json(
      { error: "오늘은 이미 룰렛을 돌리셨어요. 내일 다시 와주세요!" },
      { status: 409 },
    );
  }

  await recordSpin(session.user.id, id);
  return NextResponse.json({ ok: true }, { status: 201 });
}
