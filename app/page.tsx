import Link from "next/link";

export default function HomePage() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>QR-Place</h1>
        <span className="sub">데모</span>
      </header>

      <div className="section">
        <p className="muted" style={{ marginTop: 0 }}>
          QR 스캔 → 메뉴 조회 → 장바구니 → 결제 → 주문 완료.
          쌓인 주문 데이터로 다음 방문 때 개인화 추천.
        </p>

        <h2 className="section-title" style={{ margin: "18px 0 8px" }}>
          고객 화면
        </h2>
        <ul className="plain" style={{ padding: 0 }}>
          <li>
            <Link href="/stores/1?table=A1">
              🍽️ 메뉴판 — 비로그인 (인기순)
            </Link>
          </li>
          <li>
            <Link href="/stores/1?table=A1&userId=1">
              🌶️ 메뉴판 — 로그인 유저 1 (매운맛 취향, 개인화)
            </Link>
          </li>
        </ul>

        <h2 className="section-title" style={{ margin: "18px 0 8px" }}>
          점주 화면
        </h2>
        <ul className="plain" style={{ padding: 0 }}>
          <li>
            <Link href="/dashboard/1">📊 대시보드 — 매출·방문자·주문·인기메뉴</Link>
          </li>
          <li>
            <Link href="/dashboard/new">🏪 신규 매장 등록 (카카오 장소 검색)</Link>
          </li>
        </ul>

        <div className="notice" style={{ marginLeft: 0, marginRight: 0 }}>
          결제는 <b>데모용 모의 결제</b>입니다. 실제 카드 승인이나 청구는
          일어나지 않으며, 실제 PG(토스페이먼츠·카카오페이) 연동 지점은
          <code> app/api/orders/[orderId]/pay/route.ts </code>에 표시돼 있습니다.
        </div>
      </div>
    </div>
  );
}
