import type { ReactNode } from "react";

/**
 * 점주용 화면은 기획서상 "PC 대시보드"라 손님용 모바일 셸(.app, 460px)에
 * 가두지 않고 더 넓은 폭(.dash, 900px)을 쓴다.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="dash">{children}</div>;
}
