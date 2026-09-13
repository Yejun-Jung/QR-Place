/**
 * API 라우트용 권한 가드.
 *
 * 반환값이 null 이면 통과, NextResponse 면 그대로 돌려줘서 요청을 막는다.
 *
 *   const denied = await denyUnlessStoreOwner(storeId);
 *   if (denied) return denied;
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStore, getStoreMenus } from "@/lib/db";
import type { Order } from "@/lib/types";

/**
 * 점주 전용 API: 로그인했고 + 이 매장의 소유자여야 한다.
 * (매출 통계·주문 목록·메뉴 CRUD 처럼 남의 매장 것을 보면 안 되는 라우트용)
 */
export async function denyUnlessStoreOwner(
  storeId: number,
  menuId?: number,
): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const store = await getStore(storeId);
  if (!store) {
    return NextResponse.json({ error: "store not found" }, { status: 404 });
  }
  if (store.owner_user_id !== session.user.id) {
    return NextResponse.json(
      { error: "이 매장의 점주가 아닙니다" },
      { status: 403 },
    );
  }

  // 메뉴 단건 조작은 "그 메뉴가 이 매장 것인지"까지 본다. 안 그러면 자기 매장
  // id로 가드를 통과한 뒤 남의 매장 menuId를 넘겨 수정/삭제할 수 있다.
  if (menuId != null) {
    const menus = await getStoreMenus(storeId);
    if (!menus.some((m) => m.id === menuId)) {
      return NextResponse.json({ error: "menu not found" }, { status: 404 });
    }
  }

  return null;
}

const normalizeTable = (v: string | null | undefined) =>
  v == null || v === "" ? null : v;

/**
 * 주문 조작(결제/취소) 가드. 주문 id가 순차 정수라 번호만 바꿔가며 남의 주문을
 * 결제·취소할 수 있어서 소유권을 확인한다.
 *  - 로그인 주문이면 세션 유저가 일치해야 하고,
 *  - 비로그인(테이블) 주문이면 그 주문의 테이블 번호를 알고 있어야 한다.
 *
 * ponytail: 테이블 번호는 QR에 박혀 있어 진짜 비밀값은 아니다 — 정석은 주문
 * 생성 시 1회용 토큰을 발급해 쿠키로 들고 다니게 하는 것. 캡스톤 범위에선
 * "주문번호만으로는 못 건드린다"까지만 막는다.
 */
export async function denyUnlessOrderOwner(
  order: Order,
  tableNumber: string | null,
): Promise<NextResponse | null> {
  // 테이블 번호를 아는 사람 = 그 테이블에 앉은 손님으로 본다.
  // (같은 테이블 일행이 서로의 주문을 다루는 건 오히려 정상 동작)
  if (normalizeTable(order.table_number) === normalizeTable(tableNumber)) {
    return null;
  }

  // 로그인 주문이면 본인 세션으로도 통과 — 테이블 번호 없이 접근하는 경우 대비
  if (order.user_id != null) {
    const session = await auth();
    if (session?.user?.id === order.user_id) return null;
  }

  return NextResponse.json({ error: "본인 주문이 아닙니다" }, { status: 403 });
}
