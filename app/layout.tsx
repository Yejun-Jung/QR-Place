import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
