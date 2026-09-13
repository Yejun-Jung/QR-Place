import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_KR } from "next/font/google";
import { SessionProvider } from "next-auth/react";
// 화면 단위로 나눠둔 전역 CSS. **import 순서 = cascade 순서**라 순서를 바꾸면
// 스타일이 깨진다 (예: controls 의 .btn:active 뒤에 order 의 .cartbar:active 가
// 와야 장바구니 바의 가운데 정렬이 유지된다).
// globals.css 안에서 @import 로 묶으면 dev 서버가 변경을 못 따라와 매번 재시작이
// 필요해서, 여기서 직접 import 한다.
import "./styles/base.css";
import "./styles/menu.css";
import "./styles/controls.css";
import "./styles/order.css";
import "./styles/dashboard.css";
import "./styles/feature.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "QR-Place",
  description: "QR 스캔 메뉴 조회 · 주문 · 개인화 추천",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
