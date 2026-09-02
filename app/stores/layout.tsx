import type { ReactNode } from "react";

/**
 * 손님용 화면(모바일 웹)은 460px 모바일 셸 안에 고정한다.
 * 점주용 대시보드(app/dashboard/layout.tsx)는 별도로 PC 폭을 쓴다.
 */
export default function StoresLayout({ children }: { children: ReactNode }) {
  return <div className="app">{children}</div>;
}
