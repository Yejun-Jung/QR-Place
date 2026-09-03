import Link from "next/link";

export default function HomePage() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>QR-Place</h1>
      </header>

      <div className="section">
        <div className="notice" style={{ marginLeft: 0, marginRight: 0 }}>
          <b>📋 평가 순서 추천</b>
          <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            <li>
              🔑 점주 로그인 → 카카오 계정으로 로그인 → (처음이면) 매장 등록,
              아니면 바로 내 대시보드로 이동
            </li>
            <li>
              대시보드 → 테이블 QR 생성 → 휴대폰 카메라로 실제 QR 스캔해서
              손님 화면 진입해보기
            </li>
            <li>
              (로그인 상태로) 손님 메뉴판에서 🎰 룰렛, 🗺️ 내 맛집 지도까지
              확인
            </li>
          </ol>
        </div>

        <ul className="plain" style={{ padding: 0 }}>
          <li>
            <Link href="/dashboard">🔑 점주 로그인</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
